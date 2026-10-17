package com.hutka.backend.partner.dto;

/** Номер карты наружу отдаётся только маской «**** **** **** 1234»; present = false, если реквизиты ещё не заданы. */
public record BankDetailsResponse(boolean present, String cardMasked, String holderName) {}
