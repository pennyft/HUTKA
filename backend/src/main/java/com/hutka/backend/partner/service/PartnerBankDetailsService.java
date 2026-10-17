package com.hutka.backend.partner.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.partner.dto.BankDetailsRequest;
import com.hutka.backend.partner.dto.BankDetailsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Раздел 10.6, 21.1: банковские реквизиты партнёра (users.payout_bank_details, JSONB) — «редактируются в настройках».
 * Формат: {"cardNumber": "<16–19 цифр>", "holderName": "..."}. Выплата партнёру — на карту (15).
 * ВАЖНО: номер карты хранится в БД открытым текстом — шифрование и требования к хранению данных карт не реализованы
 * (подробнее — docs/BACKLOG_DECISIONS.md).
 */
@Service
@RequiredArgsConstructor
public class PartnerBankDetailsService {

    private final UserRepository users;
    private final PartnerAccess access;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public BankDetailsResponse get(UUID partnerId) {
        return toResponse(access.requirePartner(partnerId));
    }

    @Transactional
    public BankDetailsResponse save(UUID partnerId, BankDetailsRequest request) {
        User user = access.requirePartner(partnerId);
        String digits = request.cardNumber().replaceAll("[ -]", "");
        if (!digits.matches("\\d{16,19}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Номер карты должен содержать от 16 до 19 цифр");
        }
        Map<String, String> details = new LinkedHashMap<>();
        details.put("cardNumber", digits);
        details.put("holderName", request.holderName().trim());
        try {
            user.setPayoutBankDetails(objectMapper.writeValueAsString(details));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Реквизиты не сериализуются в JSON", e);
        }
        users.save(user);
        return toResponse(user);
    }

    private BankDetailsResponse toResponse(User user) {
        String json = user.getPayoutBankDetails();
        if (json == null || json.isBlank()) {
            return new BankDetailsResponse(false, null, null);
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            String card = node.path("cardNumber").asText("");
            if (card.length() < 4) {
                return new BankDetailsResponse(false, null, null);
            }
            return new BankDetailsResponse(true, "**** **** **** " + card.substring(card.length() - 4),
                    node.path("holderName").asText(null));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("В users.payout_bank_details лежит некорректный JSON", e);
        }
    }
}
