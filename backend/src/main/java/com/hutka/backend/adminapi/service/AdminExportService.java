package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.AdminPayoutExportRepository;
import com.hutka.backend.adminapi.ExportKind;
import com.hutka.backend.payments.Payment;
import com.hutka.backend.payments.PaymentRepository;
import com.hutka.backend.payments.Payout;
import com.hutka.backend.payments.enums.PaymentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;

/**
 * Раздел 16.5: экспорт отчётов в CSV (комиссии и выплаты). Период — как в сводке финансов: по умолчанию с начала
 * текущего месяца до сейчас. Файл собирается в памяти, поэтому есть потолок строк.
 */
@Service
@RequiredArgsConstructor
public class AdminExportService {

    static final int MAX_ROWS = 50_000;
    private static final int PAGE = 500;

    private final PaymentRepository payments;
    private final AdminPayoutExportRepository payouts;

    @Value("${app.payments.timezone:Europe/Minsk}")
    private String timezone;

    public record ExportFile(String filename, byte[] content) {}

    @Transactional(readOnly = true)
    public ExportFile export(ExportKind kind, Instant from, Instant to) {
        ZoneId zone = ZoneId.of(timezone);
        Instant end = to != null ? to : Instant.now();
        Instant start = from != null ? from : LocalDate.now(zone).withDayOfMonth(1).atStartOfDay(zone).toInstant();
        if (!end.isAfter(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "to должно быть позже from");
        }
        StringBuilder csv = new StringBuilder(CsvFormat.BOM);
        if (kind == ExportKind.commissions) {
            commissions(csv, start, end);
        } else {
            payouts(csv, start, end);
        }
        String name = "hutka-" + kind + "-" + LocalDate.ofInstant(start, zone) + "_" + LocalDate.ofInstant(end, zone) + ".csv";
        return new ExportFile(name, csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    private void commissions(StringBuilder csv, Instant from, Instant to) {
        long total = payments.countByStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(PaymentStatus.succeeded, from, to);
        requireWithinLimit(total);
        csv.append(CsvFormat.row(List.of("booking_id", "partner_id", "renter_id", "charged_at", "amount",
                "commission_percent", "commission_amount", "partner_amount", "currency")));
        for (int page = 0; ; page++) {
            Page<Payment> chunk = payments.findByStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                    PaymentStatus.succeeded, from, to, PageRequest.of(page, PAGE));
            for (Payment p : chunk.getContent()) {
                csv.append(CsvFormat.row(Arrays.asList(p.getBookingId(), p.getPartnerId(), p.getRenterId(),
                        p.getCreatedAt(), p.getAmount(), p.getCommissionPercent(), p.getCommissionAmount(),
                        p.getPartnerAmount(), p.getCurrency())));
            }
            if (!chunk.hasNext()) break;
        }
    }

    private void payouts(StringBuilder csv, Instant from, Instant to) {
        csv.append(CsvFormat.row(List.of("payout_id", "partner_id", "period_start", "period_end", "amount",
                "commission_deducted", "currency", "status", "paid_at", "created_at")));
        boolean first = true;
        for (int page = 0; ; page++) {
            Page<Payout> chunk = payouts.findInRange(from, to, PageRequest.of(page, PAGE));
            if (first) {
                requireWithinLimit(chunk.getTotalElements());
                first = false;
            }
            for (Payout p : chunk.getContent()) {
                csv.append(CsvFormat.row(Arrays.asList(p.getId(), p.getPartnerId(), p.getPeriodStart(), p.getPeriodEnd(),
                        p.getAmount(), p.getCommissionDeducted(), p.getCurrency(), p.getStatus(), p.getPaidAt(),
                        p.getCreatedAt())));
            }
            if (!chunk.hasNext()) break;
        }
    }

    private static void requireWithinLimit(long rows) {
        if (rows > MAX_ROWS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Слишком много строк для выгрузки (" + rows + " > " + MAX_ROWS + "), сузьте период");
        }
    }
}
