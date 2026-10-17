package com.hutka.backend.partner;

import com.hutka.backend.partner.dto.PartnerAnalyticsResponse;
import com.hutka.backend.partner.dto.PartnerIncomeResponse;
import com.hutka.backend.partner.dto.PartnerReviewListResponse;
import com.hutka.backend.partner.service.PartnerAnalyticsService;
import com.hutka.backend.partner.service.PartnerIncomeService;
import com.hutka.backend.partner.service.PartnerReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.UUID;

/**
 * Раздел 23.4: GET /partner/analytics (10.1, 10.5). Сверх 23.4 — два чтения, без которых нельзя закрыть 10.5:
 * GET /partner/income (детализация «дохода за месяц», «при наведении на цифру») и GET /partner/reviews (все отзывы).
 */
@RestController
@RequestMapping("/partner")
@RequiredArgsConstructor
public class PartnerAnalyticsController {

    private final PartnerAnalyticsService analyticsService;
    private final PartnerIncomeService incomeService;
    private final PartnerReviewService reviewService;

    @GetMapping("/analytics")
    public PartnerAnalyticsResponse analytics(@AuthenticationPrincipal UUID partnerId,
                                              @RequestParam(required = false) Integer weeks,
                                              @RequestParam(required = false) Integer months,
                                              @RequestParam(required = false) Integer days) {
        return analyticsService.analytics(partnerId, weeks, months, days);
    }

    /** month = yyyy-MM; без параметра — текущий месяц. */
    @GetMapping("/income")
    public PartnerIncomeResponse income(@AuthenticationPrincipal UUID partnerId,
                                        @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return incomeService.monthIncome(partnerId, month);
    }

    @GetMapping("/reviews")
    public PartnerReviewListResponse reviews(@AuthenticationPrincipal UUID partnerId,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return reviewService.list(partnerId, page, size);
    }
}
