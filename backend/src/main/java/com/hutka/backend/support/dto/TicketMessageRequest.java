package com.hutka.backend.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /tickets/:id/messages (23.5) и POST /admin/tickets/:id/messages. */
public record TicketMessageRequest(
        @NotBlank(message = "Введите сообщение") @Size(max = 4000, message = "Сообщение не длиннее 4000 символов") String body) {}
