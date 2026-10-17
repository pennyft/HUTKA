package com.hutka.backend.support.dto;

import java.util.List;

/** GET /tickets: total — всего тикетов по фильтру, items — одна страница. */
public record TicketListResponse(long total, List<TicketResponse> items) {}
