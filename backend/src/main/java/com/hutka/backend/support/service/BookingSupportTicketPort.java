package com.hutka.backend.support.service;

import com.hutka.backend.booking.service.SupportTicketPort;
import com.hutka.backend.support.Ticket;
import com.hutka.backend.support.TicketRepository;
import com.hutka.backend.support.TicketRules;
import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Реализация порта booking → support (раздел 6.5, 14). Заменяет LoggingSupportTicketPort (его файл нужно удалить, иначе
 * в контексте два бина SupportTicketPort). Вызывается из PartnerStrikeService.record внутри транзакции автоскрытия машины:
 * тикет сохраняется атомарно со скрытием. Тикет системный (нет владельца-пользователя): urgent, категория «Другое».
 */
@Component
@RequiredArgsConstructor
public class BookingSupportTicketPort implements SupportTicketPort {

    private final TicketRepository tickets;

    @Override
    @Transactional
    public void createUrgentTicketForAdmin(String subject, String description) {
        Instant now = Instant.now();
        tickets.save(Ticket.builder()
                .userId(null)
                .audience(TicketAudience.system)
                .subject(TicketRules.truncate(subject, TicketRules.SUBJECT_MAX))
                .description(TicketRules.truncate(description, TicketRules.TEXT_MAX))
                .category(TicketCategory.other)
                .priority(TicketPriority.urgent)
                .status(TicketStatus.open)
                .createdAt(now)
                .updatedAt(now)
                .awaitingAdminSince(now)
                .build());
    }
}
