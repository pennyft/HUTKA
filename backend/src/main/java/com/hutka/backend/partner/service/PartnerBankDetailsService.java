package com.hutka.backend.partner.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.partner.dto.BankDetailsRequest;
import com.hutka.backend.partner.dto.BankDetailsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Раздел 10.6, 21.1: банковские реквизиты партнёра (users.payout_bank_details, JSONB) — «редактируются в настройках».
 * Формат: {"cardNumberEnc": "v1:...", "cardLast4": "1234", "holderName": "..."}. Выплата партнёру — на карту (15).
 * Номер карты (16–19 цифр) хранится зашифрованным (AES-GCM, см. {@link PayoutCardCipher}); последние 4 цифры
 * лежат отдельно, чтобы строить маску без расшифровки. Старый формат {"cardNumber": "<открытым текстом>"}
 * читается как раньше, а при старте приложения переводится в новый (см. {@link PayoutCardMigration}).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerBankDetailsService {

    private static final String F_ENCRYPTED = "cardNumberEnc";
    private static final String F_LAST4 = "cardLast4";
    private static final String F_LEGACY_PLAIN = "cardNumber";
    private static final String F_HOLDER = "holderName";

    private final UserRepository users;
    private final PartnerAccess access;
    private final ObjectMapper objectMapper;
    private final PayoutCardCipher cipher;

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
        details.put(F_ENCRYPTED, cipher.encrypt(digits, user.getId()));
        details.put(F_LAST4, last4(digits));
        details.put(F_HOLDER, request.holderName().trim());
        user.setPayoutBankDetails(toJson(details));
        users.save(user);
        return toResponse(user);
    }

    /**
     * Полный номер карты — только для исполнителя выплат (15). Наружу через API не отдаётся и в логи не пишется.
     * Пусто, если реквизиты не заданы.
     */
    @Transactional(readOnly = true)
    public Optional<String> revealCardNumber(UUID partnerId) {
        User user = access.requirePartner(partnerId);
        JsonNode node = parse(user);
        if (node == null) {
            return Optional.empty();
        }
        String encrypted = node.path(F_ENCRYPTED).asText("");
        if (!encrypted.isEmpty()) {
            return Optional.of(cipher.decrypt(encrypted, user.getId()));
        }
        String legacy = node.path(F_LEGACY_PLAIN).asText("");
        return legacy.isEmpty() ? Optional.empty() : Optional.of(legacy);
    }

    /** Переводит записи со старым открытым номером карты в зашифрованный формат. Возвращает число переведённых. */
    @Transactional
    public int migrateLegacyCards() {
        int migrated = 0;
        for (User user : users.findByPayoutBankDetailsIsNotNull()) {
            JsonNode node = parse(user);
            if (node == null) {
                continue;
            }
            String legacy = node.path(F_LEGACY_PLAIN).asText("");
            if (legacy.isEmpty()) {
                continue;
            }
            if (legacy.length() < 4) {
                log.warn("Реквизиты пользователя {} содержат слишком короткий номер карты, пропущены", user.getId());
                continue;
            }
            Map<String, String> details = new LinkedHashMap<>();
            details.put(F_ENCRYPTED, cipher.encrypt(legacy, user.getId()));
            details.put(F_LAST4, last4(legacy));
            details.put(F_HOLDER, node.path(F_HOLDER).asText(null));
            user.setPayoutBankDetails(toJson(details));
            users.save(user);
            migrated++;
        }
        return migrated;
    }

    private BankDetailsResponse toResponse(User user) {
        JsonNode node = parse(user);
        if (node == null) {
            return new BankDetailsResponse(false, null, null);
        }
        String last4 = node.path(F_LAST4).asText("");
        if (last4.isEmpty()) {
            // запись ещё в старом формате (до миграции)
            String legacy = node.path(F_LEGACY_PLAIN).asText("");
            if (legacy.length() >= 4) {
                last4 = last4(legacy);
            }
        }
        if (last4.length() < 4) {
            return new BankDetailsResponse(false, null, null);
        }
        return new BankDetailsResponse(true, "**** **** **** " + last4, node.path(F_HOLDER).asText(null));
    }

    /** null, если реквизитов нет. */
    private JsonNode parse(User user) {
        String json = user.getPayoutBankDetails();
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("В users.payout_bank_details лежит некорректный JSON", e);
        }
    }

    private String toJson(Map<String, String> details) {
        try {
            return objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Реквизиты не сериализуются в JSON", e);
        }
    }

    private static String last4(String digits) {
        return digits.substring(digits.length() - 4);
    }
}
