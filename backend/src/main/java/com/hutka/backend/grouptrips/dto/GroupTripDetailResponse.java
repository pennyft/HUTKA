package com.hutka.backend.grouptrips.dto;

import com.hutka.backend.grouptrips.enums.GroupTripStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Карточка поездки (8): маршрут, статус, список участников. joined — участвует ли текущий пользователь;
 * chatAvailable — может ли он сейчас писать в чат (участник, поездка открыта или закрыта для набора, день не прошёл).
 */
public record GroupTripDetailResponse(
        UUID id,
        UUID organizerId,
        String route,
        LocalDate date,
        GroupTripStatus status,
        int maxParticipants,
        long participantsCount,
        boolean full,
        boolean joined,
        boolean chatAvailable,
        Instant createdAt,
        Instant closedAt,
        Instant cancelledAt,
        List<ParticipantResponse> participants) {}
