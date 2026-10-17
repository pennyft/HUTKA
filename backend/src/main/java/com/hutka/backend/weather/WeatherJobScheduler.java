package com.hutka.backend.weather;

import com.hutka.backend.weather.enums.WeatherCheckKind;
import com.hutka.backend.weather.job.WeatherCheckJob;
import lombok.RequiredArgsConstructor;
import org.quartz.JobBuilder;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.SimpleScheduleBuilder;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Планирование погодных проверок в Quartz (JDBC JobStore, 17.1) — по образцу BookingJobScheduler: одна задача на
 * (бронь, вид проверки), имя «weather-check:{kind}:{bookingId}», повторное планирование заменяет задачу.
 * REQUIRES_NEW: слушатель срабатывает после коммита брони, и запись в Quartz должна идти в собственной транзакции.
 */
@Component
@RequiredArgsConstructor
public class WeatherJobScheduler {

    public static final String BOOKING_ID = "bookingId";
    public static final String KIND = "kind";
    public static final String ATTEMPT = "attempt";
    private static final String GROUP = "weather";

    private final Scheduler scheduler;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void schedule(UUID bookingId, WeatherCheckKind kind, Instant at, int attempt) {
        String name = name(kind, bookingId);
        JobKey key = JobKey.jobKey(name, GROUP);

        JobDetail job = JobBuilder.newJob(WeatherCheckJob.class)
                .withIdentity(key)
                .usingJobData(BOOKING_ID, bookingId.toString())
                .usingJobData(KIND, kind.name())
                .usingJobData(ATTEMPT, attempt)
                .build();

        Trigger trigger = TriggerBuilder.newTrigger()
                .withIdentity(name, GROUP)
                .startAt(Date.from(at))
                .withSchedule(SimpleScheduleBuilder.simpleSchedule().withMisfireHandlingInstructionFireNow())
                .build();

        try {
            scheduler.deleteJob(key);
            scheduler.scheduleJob(job, trigger);
        } catch (SchedulerException e) {
            throw new IllegalStateException("Не удалось запланировать задачу " + name, e);
        }
    }

    /** Снимает обе проверки брони (отмена, начало поездки). Отсутствие задачи — не ошибка. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cancel(UUID bookingId) {
        try {
            for (WeatherCheckKind kind : WeatherCheckKind.values()) {
                scheduler.deleteJob(JobKey.jobKey(name(kind, bookingId), GROUP));
            }
        } catch (SchedulerException e) {
            throw new IllegalStateException("Не удалось снять погодные проверки брони " + bookingId, e);
        }
    }

    private static String name(WeatherCheckKind kind, UUID bookingId) {
        return "weather-check:" + kind.name() + ":" + bookingId;
    }
}
