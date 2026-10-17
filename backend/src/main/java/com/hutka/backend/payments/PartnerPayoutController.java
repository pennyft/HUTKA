package com.hutka.backend.payments;

import com.hutka.backend.payments.dto.PayoutDetailResponse;
import com.hutka.backend.payments.dto.PayoutListResponse;
import com.hutka.backend.payments.service.PartnerPayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST /partner/payouts (23.4, 10.6). Только HTTP-слой. Как и остальные /partner/**, опирается на JWT и фильтрует данные
 * по текущему пользователю: не-партнёр увидит пустую историю и нулевой баланс. /{id} — детализация (2-й эндпоинт сверх 23.4,
 * см. PAYMENTS_DECISIONS.md).
 */
@RestController
@RequestMapping("/partner/payouts")
@RequiredArgsConstructor
public class PartnerPayoutController {

    private final PartnerPayoutService payoutService;

    @GetMapping
    public PayoutListResponse list(@AuthenticationPrincipal UUID partnerId,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size) {
        return payoutService.list(partnerId, page, size);
    }

    @GetMapping("/{id}")
    public PayoutDetailResponse details(@AuthenticationPrincipal UUID partnerId, @PathVariable UUID id) {
        return payoutService.get(partnerId, id);
    }
}
