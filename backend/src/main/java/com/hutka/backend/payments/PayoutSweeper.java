package com.hutka.backend.payments;

import com.hutka.backend.payments.service.PayoutService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Расписание выплат (15: «раз в неделю»). По умолчанию — понедельник 03:00 по Минску (app.payments.payout-cron,
 * app.payments.timezone); в формате cron Spring: секунды минуты часы день месяц день-недели. Для демонстрации можно
 * поставить частый cron, например «0 * * * * *» — выплата будет собираться каждую минуту.
 * Простая периодическая задача — Spring @Scheduled (17.1); @EnableScheduling включён в BookingSchedulingConfig.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PayoutSweeper {

    private final PayoutService payoutService;

    @Scheduled(cron = "${app.payments.payout-cron:0 0 3 * * MON}", zone = "${app.payments.timezone:Europe/Minsk}")
    public void weekly() {
        try {
            payoutService.runWeekly();
        } catch (RuntimeException e) {
            log.error("Недельный прогон выплат не завершён: {}", e.getMessage());
        }
    }

    /** Повтор выплат, которые шлюз не принял. */
    @Scheduled(fixedDelayString = "${app.payments.sweep-interval-ms:300000}",
            initialDelayString = "${app.payments.sweep-initial-delay-ms:90000}")
    public void retry() {
        try {
            payoutService.retryPending();
        } catch (RuntimeException e) {
            log.error("Повтор выплат не завершён: {}", e.getMessage());
        }
    }
}
