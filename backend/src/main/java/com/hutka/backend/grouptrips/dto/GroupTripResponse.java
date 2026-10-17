package com.hutka.backend.grouptrips.dto;

import com.hutka.backend.grouptrips.enums.GroupTripStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Строка списка GET /group-trips. joined — участвует ли текущий пользователь; full — свободных мест нет. */
public record GroupTripResponse(
        UUID id,
        UUID organizerId,
        String organizerName,
        String route,
        LocalDate date,
        GroupTripStatus status,
        int maxParticipants,
        long participantsCount,
        boolean full,
        boolean joined,
        Instant createdAt) {}
