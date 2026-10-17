package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.AdminCarRepository;
import com.hutka.backend.adminapi.AdminStatsRepository;
import com.hutka.backend.adminapi.AdminUserRepository;
import com.hutka.backend.adminapi.dto.DashboardResponse;
import com.hutka.backend.adminapi.dto.DashboardResponse.Activity;
import com.hutka.backend.adminapi.dto.DashboardResponse.DayAmount;
import com.hutka.backend.adminapi.dto.DashboardResponse.DayCount;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.auth.enums.VerificationStatus;
import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.car.enums.ModerationStatus;
import com.hutka.backend.disputes.DisputeRepository;
import com.hutka.backend.disputes.enums.DisputeStatus;
import com.hutka.backend.payments.PaymentRepository;
import com.hutka.backend.payments.enums.PaymentStatus;
import com.hutka.backend.support.TicketRepository;
import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Раздел 16.1: дашборд. «Последние действия» собираются из событий создания (регистрация, заявка на машину, бронь,
 * спор, обращение) — журнала действий администраторов и пользователей в системе нет.
 */
@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    static final int DEFAULT_DAYS = 30;
    static final int MAX_DAYS = 365;
    private static final int ACTIVITY_LIMIT = 10;

    private final AdminStatsRepository stats;
    private final AdminUserRepository adminUsers;
    private final AdminCarRepository adminCars;
    private final PaymentRepository payments;
    private final DisputeRepository disputes;
    private final TicketRepository tickets;
    private final UserRepository users;
    private final CarRepository cars;
    private final BookingRepository bookings;

    @Value("${app.payments.timezone:Europe/Minsk}")
    private String timezone;

    @Value("${app.payments.currency:BYN}")
    private String currency;

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(Integer days) {
        int period = days == null ? DEFAULT_DAYS : Math.min(Math.max(days, 1), MAX_DAYS);
        ZoneId zone = ZoneId.of(timezone);
        LocalDate today = LocalDate.now(zone);
        LocalDate firstDay = today.minusDays(period - 1L);
        Instant since = firstDay.atStartOfDay(zone).toInstant();
        Instant end = today.plusDays(1).atStartOfDay(zone).toInstant();

        long approved = stats.countCars(ModerationStatus.approved);
        long hidden = stats.countHiddenCars(ModerationStatus.approved);

        Map<String, Long> byStatus = new LinkedHashMap<>();
        long bookingsTotal = 0;
        for (AdminStatsRepository.StatusCount row : stats.bookingCountsByStatus()) {
            byStatus.put(row.getStatus().name(), row.getCnt());
            bookingsTotal += row.getCnt();
        }

        PaymentRepository.Totals totals = payments.totals(PaymentStatus.succeeded, since, end);

        return new DashboardResponse(
                Instant.now(), period, currency,
                new DashboardResponse.Users(stats.countUsers(), stats.countUsersByVerification(VerificationStatus.verified),
                        stats.countPartners(), stats.countBlockedUsers(), stats.countUsersSince(since),
                        stats.countActiveRenters(since)),
                new DashboardResponse.Cars(approved, approved - hidden, hidden,
                        adminCars.countByModerationStatus(ModerationStatus.pending)),
                new DashboardResponse.Bookings(bookingsTotal, byStatus, stats.countBookingsSince(since)),
                new DashboardResponse.Finance(totals.getAmount(), totals.getCommission(), totals.getPartnerAmount(),
                        totals.getPaymentsCount()),
                new DashboardResponse.Queues(adminUsers.countByVerificationStatus(VerificationStatus.pending),
                        adminCars.countByModerationStatus(ModerationStatus.pending),
                        disputes.countByStatus(DisputeStatus.open),
                        tickets.countByStatus(TicketStatus.open),
                        tickets.countByStatusAndPriority(TicketStatus.open, TicketPriority.urgent)),
                counts(stats.registrationsPerDay(zone.getId(), since), firstDay, period),
                counts(stats.bookingsPerDay(zone.getId(), since), firstDay, period),
                amounts(stats.commissionPerDay(zone.getId(), since), firstDay, period),
                recentActivity());
    }

    private List<Activity> recentActivity() {
        Pageable latest = PageRequest.of(0, ACTIVITY_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Activity> all = new ArrayList<>();
        users.findAll(latest).forEach(u -> all.add(new Activity("user_registered", u.getCreatedAt(), u.getId(),
                u.getFirstName() + " " + u.getLastName())));
        cars.findAll(latest).forEach(c -> all.add(new Activity("car_submitted", c.getCreatedAt(), c.getId(),
                c.getMake() + " " + c.getModel())));
        bookings.findAll(latest).forEach(b -> all.add(new Activity("booking_created", b.getCreatedAt(), b.getId(),
                "Бронь " + shortId(b.getId()))));
        disputes.findAll(latest).forEach(d -> all.add(new Activity("dispute_opened", d.getCreatedAt(), d.getId(),
                "Спор по брони " + shortId(d.getBookingId()))));
        tickets.findAll(latest).forEach(t -> all.add(new Activity("ticket_created", t.getCreatedAt(), t.getId(),
                t.getSubject())));
        all.sort(Comparator.comparing(Activity::at).reversed());
        return all.size() > ACTIVITY_LIMIT ? List.copyOf(all.subList(0, ACTIVITY_LIMIT)) : all;
    }

    private static List<DayCount> counts(List<Object[]> rows, LocalDate first, int days) {
        Map<String, Long> byDay = new HashMap<>();
        rows.forEach(r -> byDay.put((String) r[0], ((Number) r[1]).longValue()));
        List<DayCount> result = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            String day = first.plusDays(i).toString();
            result.add(new DayCount(day, byDay.getOrDefault(day, 0L)));
        }
        return result;
    }

    private static List<DayAmount> amounts(List<Object[]> rows, LocalDate first, int days) {
        Map<String, BigDecimal> byDay = new HashMap<>();
        rows.forEach(r -> byDay.put((String) r[0], new BigDecimal(String.valueOf(r[1])).setScale(2, RoundingMode.HALF_UP)));
        List<DayAmount> result = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            String day = first.plusDays(i).toString();
            result.add(new DayAmount(day, byDay.getOrDefault(day, BigDecimal.ZERO.setScale(2))));
        }
        return result;
    }

    private static String shortId(UUID id) {
        return id.toString().substring(0, 8);
    }
}
