package com.hutka.backend.ai.service;

import java.util.List;

/** Клиент языковой модели. Единственная реализация — DeepSeekClient (раздел 11, 17.3); интерфейс нужен, чтобы подменять модель в тестах. */
public interface AiModelClient {

    record ChatMessage(String role, String content) {}

    /** Бросается при любой невозможности получить пригодный ответ: сеть, 4xx/5xx, пустой или обрезанный ответ, не задан ключ. */
    class AiUnavailableException extends RuntimeException {
        public AiUnavailableException(String message) { super(message); }
        public AiUnavailableException(String message, Throwable cause) { super(message, cause); }
    }

    /**
     * @param userId идентификатор пользователя для параметра user_id DeepSeek (допустимы [a-zA-Z0-9-_]; персональных данных нет)
     * @return содержимое ответа модели — строка с JSON-объектом
     */
    String complete(List<ChatMessage> messages, String userId);
}
