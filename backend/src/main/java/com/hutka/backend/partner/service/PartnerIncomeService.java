package com.hutka.backend.partner.service;

import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.partner.PartnerStatsRepository;
import com.hutka.backend.partner.dto.PartnerIncomeResponse;
import com.hutka.backend.payments.PaymentRules;
import com.hutka.backend.payments.enums.PaymentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Раздел 10.2, 10.5: «Доход за месяц» = сумма по завершённым за месяц броням за вычетом комиссии платформы (15).
 * Месяц и «завершённые в месяце» — по actual_end_at в часовом поясе платформы. В расчёт входят платежи pending и
 * succeeded; failed — нет (деньги не получены).
 */
@Service
@RequiredArgsConstructor
public class PartnerIncomeService {

    static final Set<PaymentStatus> COUNTED = EnumSet.of(PaymentStatus.pending, PaymentStatus.succeeded);

    private final PartnerStatsRepository stats;
    private final PartnerAccess access;
    private final CarRepository cars;

    @Value("${app.payments.timezone:Europe/Minsk}")
    private String timezone;

    @Value("${app.payments.currency:BYN}")
    private String currency;

    /** Доход за текущий месяц по каждой машине (10.2); машины без поездок в карту не попадают. */
    @Transactional(readOnly = true)
    public Map<UUID, BigDecimal> monthIncomeByCar(Collection<UUID> carIds) {
        if (carIds.isEmpty()) {
            return Map.of();
        }
        ZoneId zone = ZoneId.of(timezone);
        YearMonth month = YearMonth.now(zone);
        Map<UUID, BigDecimal> result = new HashMap<>();
        for (PartnerStatsRepository.CarIncomeRow row : stats.incomeByCar(carIds, BookingStatus.finished, COUNTED,
                start(month, zone), start(month.plusMonths(1), zone))) {
            result.put(row.getCarId(), row.getIncome());
        }
        return result;
    }

    /** GET /partner/income: итог за месяц и список поездок, вошедших в расчёт. month = null — текущий месяц. */
    @Transactional(readOnly = true)
    public PartnerIncomeResponse monthIncome(UUID partnerId, YearMonth month) {
        access.requirePartner(partnerId);
        ZoneId zone = ZoneId.of(timezone);
        YearMonth target = month != null ? month : YearMonth.now(zone);
        List<PartnerStatsRepository.TripIncomeRow> rows = stats.tripsIncome(partnerId, BookingStatus.finished, COUNTED,
                start(target, zone), start(target.plusMonths(1), zone));
        Map<UUID, Car> carsById = cars.findAllById(rows.stream().map(PartnerStatsRepository.TripIncomeRow::getCarId)
                        .distinct().toList()).stream()
                .collect(Collectors.toMap(Car::getId, Function.identity()));
        List<PartnerIncomeResponse.Trip> trips = rows.stream()
                .map(r -> new PartnerIncomeResponse.Trip(r.getBookingId(), r.getCarId(), name(carsById.get(r.getCarId())),
                        r.getFinishedAt(), r.getAmount(), r.getCommission(), r.getPartnerAmount()))
                .toList();
        BigDecimal total = PaymentRules.sum(trips.stream().map(PartnerIncomeResponse.Trip::partnerAmount).toList());
        BigDecimal commission = PaymentRules.sum(trips.stream().map(PartnerIncomeResponse.Trip::commissionAmount).toList());
        return new PartnerIncomeResponse(target.toString(), currency, total, commission, trips.size(), trips);
    }

    static Instant start(YearMonth month, ZoneId zone) {
        return month.atDay(1).atStartOfDay(zone).toInstant();
    }

    static String name(Car car) {
        return car == null ? null : car.getMake() + " " + car.getModel() + " (" + car.getPlateNumber() + ")";
    }
}
