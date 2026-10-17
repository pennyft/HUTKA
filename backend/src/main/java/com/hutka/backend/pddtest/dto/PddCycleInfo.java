package com.hutka.backend.pddtest.dto;

import java.time.Instant;


public record PddCycleInfo(int maxAttempts, int attemptsLeft, Instant nextCycleAt) {}
