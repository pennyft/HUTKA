package com.hutka.backend.support;

import com.hutka.backend.exception.BadRequestException;
import com.hutka.backend.exception.ForbiddenException;
import com.hutka.backend.exception.NotFoundException;
import com.hutka.backend.support.dto.*;
import com.hutka.backend.support.entity.SupportMessage;
import com.hutka.backend.support.entity.SupportTicket;
import com.hutka.backend.support.enums.TicketStatus;
import com.hutka.backend.support.repository.SupportMessageRepository;
import com.hutka.backend.support.repository.SupportTicketRepository;
import com.hutka.backend.user.User;
import com.hutka.backend.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupportService {

    private final SupportTicketRepository ticketRepository;
    private final SupportMessageRepository messageRepository;

    // ───── ПОЛЬЗОВАТЕЛЬ ─────

    public SupportTicketResponse createTicket(SupportTicketRequest request, User user) {
        SupportTicket ticket = SupportTicket.builder()
                .user(user)
                .subject(request.getSubject())
                .category(request.getCategory())
                .status(TicketStatus.OPEN)
                .build();

        ticketRepository.save(ticket);

        // Первое сообщение сразу при создании тикета
        SupportMessage firstMessage = SupportMessage.builder()
                .ticket(ticket)
                .sender(user)
                .text(request.getFirstMessage())
                .build();

        messageRepository.save(firstMessage);
        ticket.getMessages().add(firstMessage);

        return toTicketResponse(ticket);
    }

    public SupportTicketResponse getTicketById(UUID ticketId, User requestingUser) {
        SupportTicket ticket = getTicketOrThrow(ticketId);

        boolean isAdmin = requestingUser.getRole() == UserRole.ADMIN;
        boolean isOwner = ticket.getUser().getId().equals(requestingUser.getId());

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("Access denied");
        }

        return toTicketResponse(ticket);
    }

    public List<SupportTicketResponse> getMyTickets(UUID userId) {
        return ticketRepository.findByUserId(userId)
                .stream()
                .map(this::toTicketResponse)
                .toList();
    }

    public SupportTicketResponse sendMessage(UUID ticketId, SupportMessageRequest request, User sender) {
        SupportTicket ticket = getTicketOrThrow(ticketId);

        boolean isAdmin = sender.getRole() == UserRole.ADMIN;
        boolean isOwner = ticket.getUser().getId().equals(sender.getId());

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("Access denied");
        }

        if (ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED) {
            throw new BadRequestException("Cannot send message to a closed ticket");
        }

        SupportMessage message = SupportMessage.builder()
                .ticket(ticket)
                .sender(sender)
                .text(request.getText())
                .build();

        messageRepository.save(message);
        ticket.getMessages().add(message);

        // Если модератор написал — тикет переходит в IN_PROGRESS
        if (isAdmin && ticket.getStatus() == TicketStatus.OPEN) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
            ticket.setAssignedTo(sender);
            ticketRepository.save(ticket);
        }

        return toTicketResponse(ticket);
    }

    // ───── МОДЕРАТОР ─────

    public List<SupportTicketResponse> getTicketsByStatus(TicketStatus status) {
        return ticketRepository.findByStatus(status)
                .stream()
                .map(this::toTicketResponse)
                .toList();
    }

    public SupportTicketResponse resolveTicket(UUID ticketId) {
        SupportTicket ticket = getTicketOrThrow(ticketId);
        ticket.setStatus(TicketStatus.RESOLVED);
        ticketRepository.save(ticket);
        return toTicketResponse(ticket);
    }

    public SupportTicketResponse closeTicket(UUID ticketId) {
        SupportTicket ticket = getTicketOrThrow(ticketId);
        ticket.setStatus(TicketStatus.CLOSED);
        ticketRepository.save(ticket);
        return toTicketResponse(ticket);
    }

    // ───── ПРИВАТНЫЕ МЕТОДЫ ─────

    private SupportTicket getTicketOrThrow(UUID ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("Ticket not found"));
    }

    private SupportTicketResponse toTicketResponse(SupportTicket ticket) {
        SupportTicketResponse response = new SupportTicketResponse();
        response.setId(ticket.getId());
        response.setUserId(ticket.getUser().getId());
        response.setSubject(ticket.getSubject());
        response.setCategory(ticket.getCategory());
        response.setStatus(ticket.getStatus());
        response.setAssignedToId(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null);
        response.setCreatedAt(ticket.getCreatedAt());
        response.setUpdatedAt(ticket.getUpdatedAt());
        response.setMessages(
                ticket.getMessages().stream()
                        .map(this::toMessageResponse)
                        .toList()
        );
        return response;
    }

    private SupportMessageResponse toMessageResponse(SupportMessage message) {
        SupportMessageResponse response = new SupportMessageResponse();
        response.setId(message.getId());
        response.setSenderId(message.getSender().getId());
        response.setSenderName(message.getSender().getFirstName() + " " + message.getSender().getLastName());
        response.setText(message.getText());
        response.setCreatedAt(message.getCreatedAt());
        return response;
    }
}
