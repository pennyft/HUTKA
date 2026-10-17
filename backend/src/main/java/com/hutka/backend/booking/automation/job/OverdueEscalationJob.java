package com.hutka.backend.booking.automation.job;

import com.hutka.backend.booking.automation.BookingAutomationService;
import com.hutka.backend.booking.automation.BookingJobScheduler;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.quartz.QuartzJobBean;

import java.util.UUID;

/** Раздел 6.3: planned_end_at + 3 часа, поездка не завершена — эскалация в «Споры». */
public class OverdueEscalationJob extends QuartzJobBean {

    @Autowired
    private BookingAutomationService automation;

    @Override
    protected void executeInternal(JobExecutionContext context) {
        automation.escalateOverdue(UUID.fromString(context.getMergedJobDataMap().getString(BookingJobScheduler.BOOKING_ID)));
    }
}
