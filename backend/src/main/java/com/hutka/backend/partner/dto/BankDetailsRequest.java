package com.hutka.backend.partner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Раздел 10.6, 15: реквизиты для еженедельной выплаты — карта. Номер: 16–19 цифр (пробелы и дефисы допускаются и
 * удаляются; формат проверяет PartnerBankDetailsService).
 */
public record BankDetailsRequest(
        @NotBlank @Size(max = 30) String cardNumber,
        @NotBlank @Size(min = 2, max = 100)
        @Pattern(regexp = "^[\\p{L}][\\p{L} .'-]*$", message = "Допустимы буквы, пробел, точка, дефис и апостроф")
        String holderName) {}
