package com.hutka.backend.pddtest.dto;

import java.time.Instant;


public record PddDiscountInfo(Instant grantedAt, Instant expiresAt, int percent) {}
