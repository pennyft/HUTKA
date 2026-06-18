package com.hutka.backend.ai;

import com.hutka.backend.ai.dto.AiRequest;
import com.hutka.backend.ai.dto.AiResponse;
import com.hutka.backend.support.SupportService;
import com.hutka.backend.support.dto.SupportTicketRequest;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.user.User;
import com.hutka.backend.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiService {

    private final WebClient.Builder webClientBuilder;
    private final WeatherService weatherService;
    private final SupportService supportService;

    @Value("${deepseek.api-key}")
    private String apiKey;

    @Value("${deepseek.base-url}")
    private String baseUrl;

    public AiResponse chat(AiRequest request, User user) {
        String weather = weatherService.getWeatherForMinsk();
        String weatherWarning = weatherService.getWeatherWarning(weather);

        String systemPrompt = buildSystemPrompt(user, request.getCurrentPage(), weatherWarning);
        String aiMessage = callDeepSeek(systemPrompt, request.getMessage());

        boolean ticketCreated = false;
        if (shouldCreateTicket(aiMessage)) {
            SupportTicketRequest ticketRequest = new SupportTicketRequest();
            ticketRequest.setSubject("Вопрос от AI-помощника");
            ticketRequest.setCategory(TicketCategory.TECHNICAL);
            ticketRequest.setFirstMessage(request.getMessage());
            supportService.createTicket(ticketRequest, user);
            ticketCreated = true;
            aiMessage = "Ваш вопрос передан оператору поддержки. Мы свяжемся с вами в ближайшее время.";
        }

        return new AiResponse(aiMessage, ticketCreated);
    }

    private String buildSystemPrompt(User user, String currentPage, String weatherWarning) {
        StringBuilder sb = new StringBuilder();
        sb.append("Ты AI-помощник платформы HUTKA — белорусский p2p сервис аренды автомобилей.\n");
        sb.append("Отвечай на русском языке. Будь краток и полезен.\n\n");

        sb.append("Роль пользователя: ");
        if (user.getRole() == UserRole.PARTNER) {
            sb.append("Партнёр (владелец автомобилей). Помогай с управлением машинами, бронированиями, аналитикой и ценообразованием.\n");
        } else if (user.getRole() == UserRole.ADMIN) {
            sb.append("Администратор платформы.\n");
        } else {
            sb.append("Арендатор. Помогай с выбором машины, бронированием, советами по вождению и проблемами в дороге.\n");
        }

        sb.append("Имя пользователя: ").append(user.getFirstName()).append("\n");

        if (currentPage != null && !currentPage.isEmpty()) {
            sb.append("Текущая страница: ").append(currentPage).append("\n");
        }

        if (!weatherWarning.isEmpty()) {
            sb.append("\nПогодное предупреждение: ").append(weatherWarning).append("\n");
        }

        sb.append("\nЕсли вопрос выходит за рамки работы платформы или ты не можешь помочь — ответь фразой содержащей 'СОЗДАТЬ_ТИКЕТ' и объясни что передаёшь вопрос оператору.\n");

        return sb.toString();
    }

    private String callDeepSeek(String systemPrompt, String userMessage) {
        try {
            Map<String, Object> requestBody = Map.of(
                    "model", "deepseek-chat",
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", userMessage)
                    ),
                    "max_tokens", 500,
                    "temperature", 0.7
            );

            Map response = webClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("choices")) {
                List<Map> choices = (List<Map>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map message = (Map) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }

            return "Извините, произошла ошибка. Попробуйте позже.";
        } catch (Exception e) {
            return "Извините, сервис временно недоступен.";
        }
    }

    private boolean shouldCreateTicket(String aiMessage) {
        return aiMessage != null && aiMessage.contains("СОЗДАТЬ_ТИКЕТ");
    }
}
