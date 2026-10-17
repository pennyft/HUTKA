package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.CommissionItemResponse;
import com.hutka.backend.adminapi.dto.FinanceSummaryResponse;
import com.hutka.backend.adminapi.service.AdminFinanceService;
import com.hutka.backend.payments.dto.PayoutResponse;
import com.hutka.backend.payments.enums.PayoutStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/**
 * REST /admin/finance (16.5). Только HTTP-слой. Эндпоинты сверх 23: ТЗ задаёт раздел «Финансы», но не перечисляет пути
 * (PAYMENTS_DECISIONS.md). from/to — ISO 8601 с поясом; по умолчанию — текущий месяц.
 */
@RestController
@RequestMapping("/admin/finance")
@RequiredArgsConstructor
public class AdminFinanceController {

    private final AdminFinanceService financeService;

    @GetMapping("/summary")
    public FinanceSummaryResponse summary(@RequestParam(required = false) Instant from,
                                          @RequestParam(required = false) Instant to) {
        return financeService.summary(from, to);
    }

    @GetMapping("/commissions")
    public AdminPage<CommissionItemResponse> commissions(@RequestParam(required = false) Instant from,
                                                         @RequestParam(required = false) Instant to,
                                                         @RequestParam(defaultValue = "0") int page,
                                                         @RequestParam(defaultValue = "20") int size) {
        return financeService.commissions(from, to, page, size);
    }

    @GetMapping("/payouts")
    public AdminPage<PayoutResponse> payouts(@RequestParam(required = false) PayoutStatus status,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return financeService.payouts(status, page, size);
    }
}
