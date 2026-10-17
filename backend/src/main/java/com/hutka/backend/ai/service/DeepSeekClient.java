package com.hutka.backend.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * DeepSeek API (раздел 11, 17.3). Формат — OpenAI-совместимый POST {base-url}/chat/completions.
 * По документации DeepSeek (api-docs.deepseek.com, «Chat Completions API», «Error Codes»):
 * модели deepseek-flash и deepseek-v4-pro; thinking по умолчанию включён — для виджета чата отключён (latency, стоимость);
 * response_format json_object требует слова JSON в промпте (иначе запрос может «зависнуть»), содержимое иногда бывает пустым
 * и обрезается при finish_reason = length. Ошибки 401/402/429/5xx и всё перечисленное сводятся к AiUnavailableException.
 */
@Slf4j
@Service
public class DeepSeekClient implements AiModelClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final int maxTokens;

    public DeepSeekClient(
            ObjectMapper objectMapper,
            @Value("${app.ai.base-url:https://api.deepseek.com}") String baseUrl,
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.model:deepseek-flash}") String model,
            @Value("${app.ai.max-tokens:700}") int maxTokens,
            @Value("${app.ai.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${app.ai.read-timeout-ms:25000}") int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.maxTokens = maxTokens;
    }

    @Override
    public String complete(List<ChatMessage> messages, String userId) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("app.ai.api-key не задан (переменная DEEPSEEK_API_KEY): AI-помощник недоступен");
            throw new AiUnavailableException("API-ключ не задан");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", messages.stream().map(m -> Map.of("role", m.role(), "content", m.content())).toList());
        body.put("thinking", Map.of("type", "disabled"));
        body.put("response_format", Map.of("type", "json_object"));
        body.put("max_tokens", maxTokens);
        body.put("temperature", 0.3);
        body.put("stream", false);
        body.put("user_id", userId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        String raw;
        try {
            raw = restTemplate.postForObject(baseUrl + "/chat/completions", new HttpEntity<>(body, headers), String.class);
        } catch (HttpStatusCodeException e) {
            logHttpError(e.getStatusCode());
            throw new AiUnavailableException("DeepSeek вернул " + e.getStatusCode().value(), e);
        } catch (RestClientException e) {
            log.warn("DeepSeek недоступен: {}", e.getMessage());
            throw new AiUnavailableException("DeepSeek недоступен", e);
        }

        try {
            JsonNode choice = objectMapper.readTree(raw).path("choices").path(0);
            String finishReason = choice.path("finish_reason").asText("");
            String content = choice.path("message").path("content").asText("");
            if (!"stop".equals(finishReason)) {
                // length — ответ обрезан, JSON невалиден; content_filter / insufficient_system_resource / aborted — ответа нет
                throw new AiUnavailableException("Ответ не завершён: finish_reason = " + finishReason);
            }
            if (content.isBlank()) {
                throw new AiUnavailableException("Пустой ответ модели");
            }
            return content;
        } catch (JsonProcessingException | IllegalArgumentException e) {
            throw new AiUnavailableException("Некорректный ответ DeepSeek", e);
        }
    }

    private static void logHttpError(HttpStatusCode status) {
        switch (status.value()) {
            case 401 -> log.error("DeepSeek: 401 — неверный API-ключ");
            case 402 -> log.error("DeepSeek: 402 — на аккаунте закончился баланс");
            case 429 -> log.warn("DeepSeek: 429 — превышен лимит запросов провайдера");
            default -> log.warn("DeepSeek вернул {}", status.value());
        }
    }
}
