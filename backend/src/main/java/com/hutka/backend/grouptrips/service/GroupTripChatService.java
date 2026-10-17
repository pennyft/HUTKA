package com.hutka.backend.grouptrips.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.grouptrips.GroupTrip;
import com.hutka.backend.grouptrips.GroupTripMessage;
import com.hutka.backend.grouptrips.GroupTripMessageRepository;
import com.hutka.backend.grouptrips.GroupTripParticipant;
import com.hutka.backend.grouptrips.GroupTripParticipantRepository;
import com.hutka.backend.grouptrips.GroupTripRepository;
import com.hutka.backend.grouptrips.GroupTripRules;
import com.hutka.backend.grouptrips.dto.ChatMessageListResponse;
import com.hutka.backend.grouptrips.dto.ChatMessageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Чат групповой поездки (раздел 8, 23.5). Доступ — только участникам (включая организатора).
 *
 * Доставка в реальном времени: сообщение сохраняется в транзакции, а после commit рассылается каждому участнику в его
 * персональную очередь /user/queue/group-trips/{tripId}/chat — тем же механизмом, что уведомления (13). Благодаря этому
 * не нужно проверять права на SUBSCRIBE: чужую пользовательскую очередь подписать нельзя, а сообщение уходит только
 * тем, кто участвует в поездке в момент отправки. Отправитель получает своё сообщение тоже (подтверждение и порядок).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GroupTripChatService {

    private static final int MAX_PAGE_SIZE = 100;

    private final GroupTripRepository trips;
    private final GroupTripParticipantRepository participants;
    private final GroupTripMessageRepository messages;
    private final UserRepository users;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.group-trips.timezone:Europe/Minsk}")
    private String timezone;

    /** Адрес для клиента: подписка /user/queue/group-trips/{tripId}/chat (префикс /user и подстановку делает Spring). */
    static String userDestination(UUID tripId) {
        return "/queue/group-trips/" + tripId + "/chat";
    }

    // ---------------------------------------------------------------- отправка (STOMP SEND /app/group-trips/{id}/chat)

    @Transactional
    public ChatMessageResponse send(UUID userId, UUID tripId, String rawBody) {
        GroupTrip trip = trips.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Поездка не найдена"));
        requireMember(tripId, userId);
        if (!GroupTripRules.chatWritable(trip.getStatus(), trip.getTripDate(), today())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Чат поездки закрыт для новых сообщений: поездка завершена или отменена");
        }
        String body;
        try {
            body = GroupTripRules.normalize(rawBody, GroupTripRules.MESSAGE_MAX, "Сообщение");
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        GroupTripMessage saved = messages.save(GroupTripMessage.builder()
                .tripId(tripId)
                .senderId(userId)
                .body(body)
                .createdAt(Instant.now())
                .build());
        User sender = users.findById(userId).orElse(null);
        ChatMessageResponse dto = toResponse(saved, sender == null ? null : name(sender));

        List<UUID> recipients = participants.findByTripIdOrderByJoinedAtAscIdAsc(tripId).stream()
                .map(GroupTripParticipant::getUserId).toList();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                broadcast(tripId, recipients, dto);
            }
        });
        return dto;
    }

    // ---------------------------------------------------------------- GET /group-trips/:id/messages

    /**
     * Вся история чата, включая сообщения до присоединения участника (8). Новые сверху: page = 0 — самые свежие.
     * Только участникам; чужой поездки не существует — 404, не участник существующей — 403.
     */
    @Transactional(readOnly = true)
    public ChatMessageListResponse history(UUID userId, UUID tripId, int page, int size) {
        if (!trips.existsById(tripId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Поездка не найдена");
        }
        requireMember(tripId, userId);
        Page<GroupTripMessage> result = messages.findByTripId(tripId,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                        Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
        Map<UUID, User> senders = users.findAllById(result.getContent().stream()
                        .map(GroupTripMessage::getSenderId).filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return new ChatMessageListResponse(result.getTotalElements(), result.getContent().stream()
                .map(m -> toResponse(m, senders.containsKey(m.getSenderId()) ? name(senders.get(m.getSenderId())) : null))
                .toList());
    }

    // ---------------------------------------------------------------- внутреннее

    private void requireMember(UUID tripId, UUID userId) {
        if (!participants.existsByTripIdAndUserId(tripId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Чат доступен только участникам поездки");
        }
    }

    /** Сбой доставки одному получателю не должен мешать остальным: сообщение уже сохранено и доступно в истории. */
    private void broadcast(UUID tripId, List<UUID> recipients, ChatMessageResponse dto) {
        for (UUID recipient : recipients) {
            try {
                messagingTemplate.convertAndSendToUser(recipient.toString(), userDestination(tripId), dto);
            } catch (RuntimeException e) {
                log.warn("Не удалось доставить сообщение {} чата поездки {} пользователю {}: {}",
                        dto.id(), tripId, recipient, e.getMessage());
            }
        }
    }

    private LocalDate today() {
        return LocalDate.now(ZoneId.of(timezone));
    }

    private static String name(User user) {
        return GroupTripRules.displayName(user.getFirstName(), user.getLastName());
    }

    private static ChatMessageResponse toResponse(GroupTripMessage m, String senderName) {
        return new ChatMessageResponse(m.getId(), m.getTripId(), m.getSenderId(), senderName, m.getBody(), m.getCreatedAt());
    }
}
