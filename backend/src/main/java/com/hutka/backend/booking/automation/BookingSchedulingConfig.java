package com.hutka.backend.booking.automation;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Включает @Scheduled для BookingSweeper (раздел 17.1: простые периодические задачи — Spring @Scheduled). */
@Configuration
@EnableScheduling
public class BookingSchedulingConfig {
}
