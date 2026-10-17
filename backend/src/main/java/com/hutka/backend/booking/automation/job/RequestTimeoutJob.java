package com.hutka.backend.booking.automation.job;

import com.hutka.backend.booking.automation.BookingAutomationService;
import com.hutka.backend.booking.automation.BookingJobScheduler;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.quartz.QuartzJobBean;

import java.util.UUID;

/** Раздел 6.1: 6 часов без ответа партнёра на заявку Request to Book. */
public class RequestTimeoutJob extends QuartzJobBean {

    @Autowired
    private BookingAutomationService automation;

    @Override
    protected void executeInternal(JobExecutionContext context) {
        automation.expireRequest(UUID.fromString(context.getMergedJobDataMap().getString(BookingJobScheduler.BOOKING_ID)));
    }
}
