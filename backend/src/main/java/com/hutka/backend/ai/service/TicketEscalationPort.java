package com.hutka.backend.ai.service;

import com.hutka.backend.ai.dto.AiTicketDraft;

import java.util.UUID;

/** Точка подключения ai → support (раздел 11.3: AI создаёт тикет за пользователя). Реализация — support.AiTicketEscalationPort. */
public interface TicketEscalationPort {

    /** @return id созданного тикета; audience (renter / partner) определяется кабинетом, из которого пишет пользователь */
    UUID createTicket(UUID userId, AiTicketDraft draft, boolean partnerCabinet);
}
