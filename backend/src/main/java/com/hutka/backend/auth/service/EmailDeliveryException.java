package com.hutka.backend.auth.service;

/** Письмо не удалось отправить (SMTP недоступен и т.п.). Обрабатывается как 503. */
public class EmailDeliveryException extends RuntimeException {
    public EmailDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
