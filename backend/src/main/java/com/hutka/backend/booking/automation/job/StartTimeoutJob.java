package com.hutka.backend.booking.automation.job;

import com.hutka.backend.booking.automation.BookingAutomationService;
import com.hutka.backend.booking.automation.BookingJobScheduler;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.quartz.QuartzJobBean;

import java.util.UUID;

/** Разделы 6.1 и 6.5: 1 час после planned_start_at, поездка не начата — автоотмена (no-show арендатора или партнёра). */
public class StartTimeoutJob extends QuartzJobBean {

    @Autowired
    private BookingAutomationService automation;

    @Override
    protected void executeInternal(JobExecutionContext context) {
        automation.cancelOnStartTimeout(UUID.fromString(context.getMergedJobDataMap().getString(BookingJobScheduler.BOOKING_ID)));
    }
}
