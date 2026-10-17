package com.hutka.backend.pddtest;

import java.time.Duration;


public final class PddRules {

    private PddRules() {}


    public static final int QUESTIONS_PER_ATTEMPT = 10;


    public static final int MAX_ERRORS = 1;


    public static final Duration TIME_LIMIT = Duration.ofMinutes(15);


    public static final Duration SUBMIT_GRACE = Duration.ofSeconds(15);


    public static final int MAX_ATTEMPTS_PER_CYCLE = 3;


    public static final int CYCLE_LENGTH_MONTHS = 1;


    public static final Duration DISCOUNT_VALIDITY = Duration.ofDays(3);
}
