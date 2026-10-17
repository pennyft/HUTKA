package com.hutka.backend.ai.dto;

import java.util.UUID;

/** Тикет, который AI создал сам (11.3). */
public record AiCreatedTicket(UUID id, String priority) {}
