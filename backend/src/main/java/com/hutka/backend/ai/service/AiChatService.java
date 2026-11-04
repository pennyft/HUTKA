package com.hutka.backend.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hutka.backend.ai.AiModelReply;
import com.hutka.backend.ai.AiReplyParser;
import com.hutka.backend.ai.AiRules;
import com.hutka.backend.ai.dto.AiCarSuggestion;
import com.hutka.backend.ai.dto.AiChatRequest;
import com.hutka.backend.ai.dto.AiChatResponse;
import com.hutka.backend.ai.dto.AiCreatedTicket;
import com.hutka.backend.ai.dto.AiHistoryItem;
import com.hutka.backend.ai.dto.AiTicketDraft;
import com.hutka.backend.ai.enums.AiAction;
import com.hutka.backend.ai.enums.AiCabinet;
import com.hutka.backend.ai.enums.AiChatStatus;
import com.hutka.backend.ai.service.AiModelClient.AiUnavailableException;
import com.hutka.backend.ai.service.AiModelClient.ChatMessage;
import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.auth.service.RateLimitService;
import com.hutka.backend.notifications.enums.NotificationType;
import com.hutka.backend.notifications.service.NotificationService;
import com.hutka.backend.settings.PlatformSettings;
import com.hutka.backend.settings.PlatformSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Раздел 11 и 23.11: запрос-ответ виджета AI-помощника. Сам класс не транзакционный: HTTP-вызов модели не должен держать
 * соединение с БД; каждый порт (поиск машин, создание тикета, уведомление) открывает свою короткую транзакцию.
 * Решения, которых нет в Hutka.md дословно, — docs/AI_DECISIONS.md.
 */
@Slf4j
@Service
public class AiChatService {

    static final String MSG_UNAVAILABLE =
            "AI-помощник временно недоступен. Вы можете описать вопрос в обращении в поддержку — оператор ответит.";
    static final String MSG_RATE_LIMITED =
            "Вы исчерпали лимит сообщений AI-помощнику на этот час. Вы можете описать вопрос в обращении в поддержку — оператор ответит.";
    static final String MSG_NO_CARS =
            "По этим условиям подходящих машин не нашлось. Попробуйте смягчить условия — например, цену или тип кузова.";
    static final String MSG_TICKET_FAILED =
            "Не удалось создать обращение автоматически. Вы можете отправить его сами кнопкой ниже.";
    static final String MSG_EMERGENCY =
            "Если есть угроза жизни или здоровью — сразу звоните 112.";
    static final int MAX_CARS = 5;
    private static final String RATE_KEY_PREFIX = "ai-chat:";
    /** Окно статистики партнёра для советов по цене и дням (11.2) — в ТЗ не задано, см. AI_DECISIONS.md. */
    static final int PARTNER_STATS_DAYS = 90;

    private final UserRepository users;
    private final RateLimitService rateLimit;
    private final PlatformSettingsService settings;
    private final AiPromptBuilder promptBuilder;
    private final AiModelClient modelClient;
    private final CarSearchPort carSearch;
    private final TicketEscalationPort tickets;
    private final PartnerInsightsPort partnerInsights;
    private final NotificationService notifications;
    private final ObjectMapper objectMapper;
    private final int hourlyLimit;
    private final boolean autoEscalateDanger;

    public AiChatService(UserRepository users, RateLimitService rateLimit, PlatformSettingsService settings,
                         AiPromptBuilder promptBuilder, AiModelClient modelClient, CarSearchPort carSearch,
                         TicketEscalationPort tickets, PartnerInsightsPort partnerInsights,
                         NotificationService notifications, ObjectMapper objectMapper,
                         @Value("${app.ai.hourly-limit:30}") int hourlyLimit,
                         @Value("${app.ai.auto-escalate-danger:false}") boolean autoEscalateDanger) {
        this.users = users;
        this.rateLimit = rateLimit;
        this.settings = settings;
        this.promptBuilder = promptBuilder;
        this.modelClient = modelClient;
        this.carSearch = carSearch;
        this.tickets = tickets;
        this.partnerInsights = partnerInsights;
        this.notifications = notifications;
        this.objectMapper = objectMapper;
        this.hourlyLimit = hourlyLimit;
        this.autoEscalateDanger = autoEscalateDanger;
    }

    public AiChatResponse chat(UUID userId, AiChatRequest request) {
        String message = AiRules.clean(request.message(), AiRules.MAX_MESSAGE);
        if (message.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Введите сообщение");
        }
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Требуется авторизация"));
        boolean partnerCabinet = request.cabinet() == AiCabinet.partner && user.isPartner();
        boolean danger = AiRules.looksDangerous(message);

        // Раздел 11: 30 сообщений в час на пользователя. Redis недоступен → ошибка наверх (как в RateLimitService), не «безлимит»
        try {
            rateLimit.check(RATE_KEY_PREFIX + userId, hourlyLimit, Duration.ofHours(1));
        } catch (ResponseStatusException e) {
            if (e.getStatusCode().value() != HttpStatus.TOO_MANY_REQUESTS.value()) throw e;
            return fallback(AiChatStatus.rate_limited, MSG_RATE_LIMITED, message, danger);
        }

        AiModelReply parsed;
        try {
            String content = modelClient.complete(buildMessages(user, partnerCabinet, request, message), userId.toString());
            parsed = AiReplyParser.parse(content, objectMapper);
        } catch (AiUnavailableException e) {
            log.warn("AI недоступен для пользователя {}: {}", userId, e.getMessage());
            return fallback(AiChatStatus.unavailable, MSG_UNAVAILABLE, message, danger);
        } catch (IllegalArgumentException e) {
            log.warn("Ответ AI не разобран для пользователя {}: {}", userId, e.getMessage());
            return fallback(AiChatStatus.unavailable, MSG_UNAVAILABLE, message, danger);
        }
        return act(userId, partnerCabinet, message, danger, parsed);
    }

    // ---------------------------------------------------------------- исполнение действия модели

    private AiChatResponse act(UUID userId, boolean partnerCabinet, String message, boolean danger, AiModelReply parsed) {
        AiAction action = parsed.action();
        AiTicketDraft draft = parsed.ticket();

        // Страховка: опасную ситуацию не должен пропустить промах модели (11.1)
        if (danger && action != AiAction.create_ticket && action != AiAction.offer_ticket) {
            action = AiAction.offer_ticket;
            draft = null;
        }
        boolean urgent = danger || (draft != null && "urgent".equals(draft.priority()));
        boolean emergency = danger || (action == AiAction.offer_ticket && urgent);
        String reply = emergency && !parsed.reply().contains("112") ? parsed.reply() + "\n\n" + MSG_EMERGENCY : parsed.reply();

        return switch (action) {
            case search_cars -> searchCars(reply, parsed);
            case create_ticket -> createTicket(userId, partnerCabinet, message, reply, normalizeDraft(draft, message, urgent), emergency);
            case offer_ticket -> {
                AiTicketDraft offered = normalizeDraft(draft, message, urgent);
                // По умолчанию тикет предлагается (11.1); авто-создание для опасных ситуаций включается настройкой
                yield urgent && autoEscalateDanger
                        ? createTicket(userId, partnerCabinet, message, reply, offered, emergency)
                        : new AiChatResponse(AiChatStatus.ok, reply, List.of(), null, offered, emergency);
            }
            case none -> new AiChatResponse(AiChatStatus.ok, reply, List.of(), null, null, emergency);
        };
    }

    private AiChatResponse searchCars(String reply, AiModelReply parsed) {
        List<AiCarSuggestion> cars = carSearch.search(parsed.carQuery(), MAX_CARS).stream()
                .map(h -> new AiCarSuggestion(h.id(), h.make(), h.model(), h.year(), h.pricePerHour(), h.seats(),
                        h.fuelType(), h.transmission(), h.bodyType(), h.ratingAvg(), h.photoUrl()))
                .toList();
        // Текст модели написан до поиска, поэтому при пустой выдаче он заменяется — иначе «подобрала варианты» рядом с пустым списком
        return new AiChatResponse(AiChatStatus.ok, cars.isEmpty() ? MSG_NO_CARS : reply, cars, null, null, false);
    }

    private AiChatResponse createTicket(UUID userId, boolean partnerCabinet, String message, String reply,
                                        AiTicketDraft draft, boolean emergency) {
        AiTicketDraft full = new AiTicketDraft(draft.category(), draft.priority(), draft.subject(),
                (draft.description() == null ? "" : draft.description() + "\n\n") + "Сообщение пользователя AI-помощнику:\n" + message);
        UUID ticketId;
        try {
            ticketId = tickets.createTicket(userId, full, partnerCabinet);
        } catch (RuntimeException e) {
            log.error("AI не смог создать тикет для пользователя {}: {}", userId, e.getMessage());
            return new AiChatResponse(AiChatStatus.ok, MSG_TICKET_FAILED, List.of(), null, draft, emergency);
        }
        try {
            // Раздел 13: «эскалация обращения от AI-помощника к оператору»; сбой уведомления не отменяет созданный тикет
            notifications.send(userId, NotificationType.ai_escalated,
                    Map.of("ticketId", ticketId.toString(), "subject", draft.subject(), "priority", draft.priority()));
        } catch (RuntimeException e) {
            log.warn("Уведомление ai_escalated для {} не отправлено: {}", userId, e.getMessage());
        }
        return new AiChatResponse(AiChatStatus.ok, reply, List.of(), new AiCreatedTicket(ticketId, draft.priority()), null, emergency);
    }

    /** Модель может не заполнить тему и приоритет, поэтому недостающее берётся из сообщения пользователя. */
    private static AiTicketDraft normalizeDraft(AiTicketDraft draft, String message, boolean urgent) {
        String category = draft == null || draft.category() == null ? "other" : draft.category();
        String subject = draft == null || draft.subject() == null ? AiRules.subjectFrom(message) : AiRules.clean(draft.subject(), 200);
        if (subject.isEmpty()) subject = AiRules.subjectFrom(message);
        String description = draft == null ? null : draft.description();
        return new AiTicketDraft(category, urgent ? "urgent" : "normal", subject, description);
    }

    /** AI недоступен или лимит исчерпан: виджет получает черновик обычного тикета (11: «пользователь не остаётся без пути»). */
    private static AiChatResponse fallback(AiChatStatus status, String text, String message, boolean danger) {
        AiTicketDraft draft = new AiTicketDraft("other", danger ? "urgent" : "normal", AiRules.subjectFrom(message), message);
        String reply = danger ? text + "\n\n" + MSG_EMERGENCY : text;
        return new AiChatResponse(status, reply, List.of(), null, draft, danger);
    }

    // ---------------------------------------------------------------- сборка запроса к модели

    private List<ChatMessage> buildMessages(User user, boolean partnerCabinet, AiChatRequest request, String message) {
        PlatformSettings cfg = settings.get();
        PartnerInsightsPort.PartnerInsights insights = partnerCabinet
                ? partnerInsights.insightsFor(user.getId(), PARTNER_STATS_DAYS) : null;
        String system = promptBuilder.build(new AiPromptBuilder.Context(
                partnerCabinet ? AiCabinet.partner : AiCabinet.renter,
                user.getVerificationStatus().name(), user.isPartner(), AiRules.sanitizePage(request.page()),
                cfg.getCommissionPercent(), cfg.getMinRatingThreshold(), cfg.getMinRatingsCount(), insights));

        List<ChatMessage> messages = new ArrayList<>();
        messages.add(new ChatMessage("system", system));
        for (AiHistoryItem item : AiRules.trimHistory(request.history())) {
            messages.add(new ChatMessage(item.role(), item.content()));
        }
        messages.add(new ChatMessage("user", message));
        return messages;
    }
}
