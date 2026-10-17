package com.hutka.backend.support.service;

import com.hutka.backend.ai.dto.AiTicketDraft;
import com.hutka.backend.ai.service.TicketEscalationPort;
import com.hutka.backend.support.TicketRules;
import com.hutka.backend.support.dto.CreateTicketRequest;
import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketPriority;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.UUID;

/**
 * Реализация порта ai → support (раздел 11.3, 14). Переиспользует SupportService.create — тот же путь, что и POST /tickets,
 * как и предполагал docs/SUPPORT_DECISIONS.md («AI создаёт тикет за пользователя»). Тикет принадлежит пользователю,
 * поэтому он видит его в своём списке и может писать в него дальше. Текст приводится к лимитам Ticket заранее:
 * его собирает платформа и модель, и ошибка длины не должна превращаться в 400 для пользователя.
 */
@Component
@RequiredArgsConstructor
public class AiTicketEscalationPort implements TicketEscalationPort {

    private final SupportService support;

    @Override
    public UUID createTicket(UUID userId, AiTicketDraft draft, boolean partnerCabinet) {
        String subject = TicketRules.truncate(draft.subject(), TicketRules.SUBJECT_MAX);
        String description = TicketRules.truncate(draft.description(), TicketRules.TEXT_MAX);
        CreateTicketRequest request = new CreateTicketRequest(
                category(draft.category()),
                subject.isEmpty() ? "Обращение из AI-помощника" : subject,
                description.isEmpty() ? "Обращение создано AI-помощником" : description,
                "urgent".equals(draft.priority()) ? TicketPriority.urgent : TicketPriority.normal,
                partnerCabinet ? TicketAudience.partner : TicketAudience.renter);
        return support.create(userId, request).id();
    }

    private static TicketCategory category(String raw) {
        try {
            return TicketCategory.valueOf(raw.toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            return TicketCategory.other;
        }
    }
}
