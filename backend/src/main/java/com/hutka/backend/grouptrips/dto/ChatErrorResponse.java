package com.hutka.backend.grouptrips.dto;

/** Ошибка отправки в чат: приходит только отправителю в /user/queue/errors (STOMP не возвращает HTTP-статусы). */
public record ChatErrorResponse(int status, String message) {}
