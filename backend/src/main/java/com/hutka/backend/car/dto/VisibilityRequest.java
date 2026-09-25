package com.hutka.backend.car.dto;

import jakarta.validation.constraints.NotNull;

public record VisibilityRequest(@NotNull Boolean hidden) {}
