package com.hutka.backend.grouptrips.dto;

import java.util.List;

/** GET /group-trips: total — всего по фильтру, items — одна страница. */
public record GroupTripListResponse(long total, List<GroupTripResponse> items) {}
