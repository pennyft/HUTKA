package com.hutka.backend.partner.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * При старте шифрует номера карт, которые раньше были записаны в users.payout_bank_details открытым текстом.
 * Повторный запуск безопасен: уже зашифрованные записи пропускаются.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PayoutCardMigration implements ApplicationRunner {

    private final PartnerBankDetailsService service;

    @Override
    public void run(ApplicationArguments args) {
        int migrated = service.migrateLegacyCards();
        if (migrated > 0) {
            log.info("Зашифровано номеров карт партнёров: {}", migrated);
        }
    }
}
