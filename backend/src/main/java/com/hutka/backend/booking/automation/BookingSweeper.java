package com.hutka.backend.booking.automation;

import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.BookingRules;
import com.hutka.backend.booking.agreement.AgreementDeliveryService;
import com.hutka.backend.booking.enums.BookingStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;

/**
 * Страховка поверх Quartz-таймеров: раз в несколько минут ищет в БД брони, по которым срок уже вышел, а переход
 * не выполнен (джоб упал, был потерян, приложение долго не работало), и выполняет его. Это безопасно, потому что
 * все переходы в BookingAutomationService идемпотентны. Quartz даёт точность по времени, sweeper — гарантию.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingSweeper {

    /** Сколько после finish ждём, прежде чем sweeper возьмёт на себя доставку договора (даём отработать джобу). */
    private static final Duration AGREEMENT_GRACE = Duration.ofMinutes(30);
    /** Старые брони без договора не трогаем: иначе недоставляемый адрес вечно попадал бы в выборку. */
    private static final Duration AGREEMENT_MAX_AGE = Duration.ofDays(3);

    private final BookingRepository bookingRepository;
    private final BookingAutomationService automation;
    private final AgreementDeliveryService agreementDelivery;

    @Scheduled(fixedDelayString = "${app.booking.sweep-interval-ms:300000}",
            initialDelayString = "${app.booking.sweep-initial-delay-ms:60000}")
    public void sweep() {
        Instant now = Instant.now();

        run("автоотклонение заявок",
                bookingRepository.findUnansweredRequestIds(BookingStatus.pending,
                        now.minus(BookingRules.REQUEST_TO_BOOK_RESPONSE_TIMEOUT)),
                automation::expireRequest);

        run("автоотмена по неявке",
                bookingRepository.findPendingStartingBefore(BookingStatus.pending,
                        now.minus(BookingRules.NO_SHOW_TIMEOUT)),
                automation::cancelOnStartTimeout);

        run("эскалация просрочки",
                bookingRepository.findActiveEndingBefore(BookingStatus.active,
                        now.minus(BookingRules.OVERDUE_ESCALATION_AFTER)),
                automation::escalateOverdue);

        run("доставка договора",
                bookingRepository.findFinishedWithoutAgreement(BookingStatus.finished,
                        now.minus(AGREEMENT_MAX_AGE), now.minus(AGREEMENT_GRACE)),
                agreementDelivery::deliver);
    }

    private void run(String what, List<UUID> ids, Consumer<UUID> action) {
        if (!ids.isEmpty()) {
            log.info("Sweeper ({}): найдено броней — {}", what, ids.size());
        }
        for (UUID id : ids) {
            try {
                action.accept(id);
            } catch (RuntimeException e) {
                log.error("Sweeper ({}): бронь {} не обработана: {}", what, id, e.getMessage());
            }
        }
    }
}
