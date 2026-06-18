package com.hutka.backend.support.dto;

import com.hutka.backend.support.enums.TicketCategory;
import lombok.Data;

@Data
public class SupportTicketRequest {

    private String subject;
    private TicketCategory category;
    private String firstMessage;
}
