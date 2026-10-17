package com.hutka.backend.booking.automation;

import com.hutka.backend.booking.automation.job.AgreementJob;
import com.hutka.backend.booking.automation.job.OverdueEscalationJob;
import com.hutka.backend.booking.automation.job.RequestTimeoutJob;
import com.hutka.backend.booking.automation.job.StartTimeoutJob;
import lombok.RequiredArgsConstructor;
import org.quartz.Job;
import org.quartz.JobBuilder;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.SimpleScheduleBuilder;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Единственное место, которое знает про Quartz-API. Задачи привязаны к брони (раздел 17.2) и хранятся в PostgreSQL.
 * Методы @Transactional: при вызове из транзакции создания/старта/завершения брони задача пишется в БД в той же
 * транзакции — либо есть и бронь, и таймер, либо нет ни того ни другого.
 * Повторная постановка той же задачи заменяет предыдущую (ключ = тип + id брони).
 */
@Component
@RequiredArgsConstructor
public class BookingJobScheduler {

    public static final String BOOKING_ID = "bookingId";
    public static final String ATTEMPT = "attempt";
    private static final String GROUP = "booking";

    private final Scheduler scheduler;

    @Transactional
    public void scheduleRequestTimeout(UUID bookingId, Instant at) {
        schedule(RequestTimeoutJob.class, "request-timeout", bookingId, at, 0);
    }

    @Transactional
    public void scheduleStartTimeout(UUID bookingId, Instant at) {
        schedule(StartTimeoutJob.class, "start-timeout", bookingId, at, 0);
    }

    @Transactional
    public void scheduleOverdueEscalation(UUID bookingId, Instant at) {
        schedule(OverdueEscalationJob.class, "overdue-escalation", bookingId, at, 0);
    }

    /** attempt — номер попытки отправки договора (0 — первая), нужен для ограничения числа повторов. */
    @Transactional
    public void scheduleAgreement(UUID bookingId, Instant at, int attempt) {
        // Повторная попытка ставится из самой выполняющейся задачи, поэтому ключ у неё свой (с номером попытки):
        // иначе новая задача совпала бы по ключу с той, что сейчас завершается, и Quartz мог бы её удалить.
        String prefix = attempt == 0 ? "agreement" : "agreement-retry-" + attempt;
        schedule(AgreementJob.class, prefix, bookingId, at, attempt);
    }

    /**
     * Снимает таймеры no-show, ответа на заявку и эскалации просрочки (бронь отменена или завершена).
     * Если задачи уже нет — это не ошибка. Задачи договора не трогаем.
     */
    @Transactional
    public void cancelTimers(UUID bookingId) {
        try {
            for (String prefix : List.of("request-timeout", "start-timeout", "overdue-escalation")) {
                scheduler.deleteJob(JobKey.jobKey(prefix + ":" + bookingId, GROUP));
            }
        } catch (SchedulerException e) {
            throw new IllegalStateException("Не удалось снять таймеры брони " + bookingId, e);
        }
    }

    private void schedule(Class<? extends Job> type, String prefix, UUID bookingId, Instant at, int attempt) {
        String name = prefix + ":" + bookingId;
        JobKey key = JobKey.jobKey(name, GROUP);

        JobDetail job = JobBuilder.newJob(type)
                .withIdentity(key)
                .usingJobData(BOOKING_ID, bookingId.toString())
                .usingJobData(ATTEMPT, attempt)
                .build();

        // Если приложение было выключено в момент срока, после запуска задача выполнится сразу (misfire → fire now).
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
}
