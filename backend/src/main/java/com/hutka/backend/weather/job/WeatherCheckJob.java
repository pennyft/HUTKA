package com.hutka.backend.weather.job;

import com.hutka.backend.weather.WeatherJobScheduler;
import com.hutka.backend.weather.enums.WeatherCheckKind;
import com.hutka.backend.weather.service.WeatherCheckService;
import lombok.extern.slf4j.Slf4j;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.quartz.QuartzJobBean;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Quartz-задача погодной проверки (17.2). Если прогноз получить не удалось, повторяется с нарастающей паузой
 * (10, 20 минут) и после трёх попыток сдаётся: погодное уведомление не критично, чтобы повторять бесконечно
 * (в отличие от договора, AgreementJob).
 */
@Slf4j
public class WeatherCheckJob extends QuartzJobBean {

    private static final int MAX_ATTEMPTS = 3;
    private static final Duration RETRY_PAUSE = Duration.ofMinutes(10);

    @Autowired
    private WeatherCheckService checkService;
    @Autowired
    private WeatherJobScheduler jobScheduler;

    @Override
    protected void executeInternal(JobExecutionContext context) {
        UUID bookingId = UUID.fromString(context.getMergedJobDataMap().getString(WeatherJobScheduler.BOOKING_ID));
        WeatherCheckKind kind = WeatherCheckKind.valueOf(context.getMergedJobDataMap().getString(WeatherJobScheduler.KIND));
        int attempt = context.getMergedJobDataMap().getInt(WeatherJobScheduler.ATTEMPT);
        try {
            checkService.check(bookingId, kind);
        } catch (RuntimeException e) {
            if (attempt + 1 >= MAX_ATTEMPTS) {
                log.error("Погода по брони {} ({}): {} попытки исчерпаны, последняя ошибка: {}", bookingId, kind, MAX_ATTEMPTS, e.getMessage());
                return;
            }
            Duration pause = RETRY_PAUSE.multipliedBy(attempt + 1L);
            log.warn("Погода по брони {} ({}): попытка {} не удалась ({}), повтор через {}", bookingId, kind, attempt + 1, e.getMessage(), pause);
            jobScheduler.schedule(bookingId, kind, Instant.now().plus(pause), attempt + 1);
        }
    }
}
