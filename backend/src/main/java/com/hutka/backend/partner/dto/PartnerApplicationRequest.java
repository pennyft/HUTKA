package com.hutka.backend.partner.dto;

import com.hutka.backend.partner.enums.PartnerType;
import lombok.Data;

@Data
public class PartnerApplicationRequest {

    private PartnerType partnerType;

    // Для физлица
    private String passportNumber;

    // Для юрлица / ИП
    private String companyName;
    private String taxNumber;

    private boolean termsAccepted;
}
