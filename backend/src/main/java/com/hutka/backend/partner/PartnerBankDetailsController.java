package com.hutka.backend.partner;

import com.hutka.backend.partner.dto.BankDetailsRequest;
import com.hutka.backend.partner.dto.BankDetailsResponse;
import com.hutka.backend.partner.service.PartnerBankDetailsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Раздел 10.6: банковские реквизиты партнёра («редактируются в настройках»). В 23.4 такого эндпоинта нет — добавлен, чтобы закрыть 10.6. */
@RestController
@RequestMapping("/partner/payout-details")
@RequiredArgsConstructor
public class PartnerBankDetailsController {

    private final PartnerBankDetailsService service;

    @GetMapping
    public BankDetailsResponse get(@AuthenticationPrincipal UUID partnerId) {
        return service.get(partnerId);
    }

    @PutMapping
    public BankDetailsResponse save(@AuthenticationPrincipal UUID partnerId, @Valid @RequestBody BankDetailsRequest request) {
        return service.save(partnerId, request);
    }
}
