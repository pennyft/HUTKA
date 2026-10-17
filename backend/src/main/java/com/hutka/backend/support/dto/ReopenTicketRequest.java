package com.hutka.backend.support.dto;

import jakarta.validation.constraints.Size;

/** PATCH /tickets/:id/reopen (23.5). Тело необязательно: message — пояснение, почему проблема повторилась (попадёт в переписку). */
public record ReopenTicketRequest(
        @Size(max = 4000, message = "Сообщение не длиннее 4000 символов") String message) {}
