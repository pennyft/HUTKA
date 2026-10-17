package com.hutka.backend.booking.automation.job;

import com.hutka.backend.booking.agreement.AgreementDeliveryService;
import com.hutka.backend.booking.automation.BookingJobScheduler;
import lombok.extern.slf4j.Slf4j;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.quartz.QuartzJobBean;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Раздел 6.6 и 17.3a: генерация PDF-договора и отправка письма в очереди, а не в запросе finish.
 * При сбое (SMTP, диск) задача переставляется с нарастающей паузой; после MAX_ATTEMPTS попыток остаётся
 * только запись в логе — дальше подхватит sweeper (BookingSweeper), пока бронь свежая.
 */
@Slf4j
public class AgreementJob extends QuartzJobBean {

    private static final int MAX_ATTEMPTS = 5;

    @Autowired
    private AgreementDeliveryService deliveryService;
    @Autowired
    private BookingJobScheduler jobScheduler;

    @Override
    protected void executeInternal(JobExecutionContext context) {
        UUID bookingId = UUID.fromString(context.getMergedJobDataMap().getString(BookingJobScheduler.BOOKING_ID));
        int attempt = context.getMergedJobDataMap().getInt(BookingJobScheduler.ATTEMPT);
        try {
            deliveryService.deliver(bookingId);
        } catch (RuntimeException e) {
            if (attempt + 1 >= MAX_ATTEMPTS) {
                log.error("Договор по брони {}: {} попыток исчерпано, последняя ошибка: {}", bookingId, MAX_ATTEMPTS, e.getMessage());
                return;
            }
            Duration pause = Duration.ofMinutes(5L * (attempt + 1));
            log.warn("Договор по брони {}: попытка {} не удалась ({}), повтор через {}", bookingId, attempt + 1, e.getMessage(), pause);
            jobScheduler.scheduleAgreement(bookingId, Instant.now().plus(pause), attempt + 1);
        }
    }
}
