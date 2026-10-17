package com.hutka.backend.ai.enums;

/**
 * Что модель просит сделать платформу (разделы 11.1, 11.3).
 * none — только ответ; search_cars — подобрать машины; create_ticket — создать тикет (нестандартный вопрос, 11.3);
 * offer_ticket — предложить пользователю тикет (опасная ситуация, 11.1).
 */
public enum AiAction { none, search_cars, create_ticket, offer_ticket }
