package com.hutka.backend.adminapi.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Раздел 16.1: дашборд. Метрики периода (days) — регистрации, активные арендаторы, брони, финансы; остальное — текущие
 * значения. Ряды без пропусков по дням в часовом поясе платформы.
 */
public record DashboardResponse(
        Instant generatedAt,
        int days,
        String currency,
        Users users,
        Cars cars,
        Bookings bookings,
        Finance finance,
        Queues queues,
        List<DayCount> registrationsByDay,
        List<DayCount> bookingsByDay,
        List<DayAmount> commissionByDay,
        List<Activity> recentActivity) {

    /** activeRenters — уникальные арендаторы, создавшие бронь за период. */
    public record Users(long total, long verified, long partners, long blocked, long newInPeriod, long activeRenters) {}

    /** visible — одобрены и не скрыты (то, что видно в каталоге). */
    public record Cars(long approved, long visible, long hidden, long pendingModeration) {}

    public record Bookings(long total, Map<String, Long> byStatus, long createdInPeriod) {}

    /** Успешные списания за период (платформа получает commission). */
    public record Finance(BigDecimal totalCharged, BigDecimal platformCommission, BigDecimal partnerEarnings,
                          long paymentsCount) {}

    /** Очереди, которые ждут администратора. */
    public record Queues(long licenseRequests, long carModeration, long openDisputes, long openTickets,
                         long urgentOpenTickets) {}

    public record DayCount(String date, long value) {}

    public record DayAmount(String date, BigDecimal value) {}

    /** type: user_registered | car_submitted | booking_created | dispute_opened | ticket_created. */
    public record Activity(String type, Instant at, UUID entityId, String label) {}
}
