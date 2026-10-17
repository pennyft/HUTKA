package com.hutka.backend.grouptrips;

import com.hutka.backend.grouptrips.enums.GroupTripStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Раздел 21.4: GroupTrip(organizer_id, route, max_participants, date, status). Дата — день поездки без времени
 * (раздел 8: «дата»), считается по часовому поясу приложения (Europe/Minsk). Связи — по id, как в Booking.carId.
 * Организатор входит в число участников (строка в group_trip_participants создаётся вместе с поездкой).
 */
@Entity
@Table(name = "group_trips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organizer_id", nullable = false, updatable = false)
    private UUID organizerId;

    @Column(nullable = false, length = 300, updatable = false)
    private String route;

    @Column(name = "max_participants", nullable = false, updatable = false)
    private Integer maxParticipants;

    @Column(name = "trip_date", nullable = false, updatable = false)
    private LocalDate tripDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private GroupTripStatus status = GroupTripStatus.open;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = createdAt;
    }

    // ---------------------------------------------------------------- переходы состояния
    // Допустимость перехода проверяет GroupTripRules (с понятным текстом отказа); здесь только запись факта.

    /** Организатор закрыл набор участников; поездка остаётся в списке и в чате (8). */
    public void closeRecruitment(Instant now) {
        status = GroupTripStatus.closed;
        closedAt = now;
        updatedAt = now;
    }

    /** Организатор полностью отменил поездку до её даты (8). */
    public void cancel(Instant now) {
        status = GroupTripStatus.cancelled;
        cancelledAt = now;
        updatedAt = now;
    }
}
