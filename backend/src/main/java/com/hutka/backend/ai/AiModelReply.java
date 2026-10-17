package com.hutka.backend.ai;

import com.hutka.backend.ai.dto.AiTicketDraft;
import com.hutka.backend.ai.enums.AiAction;
import com.hutka.backend.ai.service.CarSearchPort;

/** Разобранный и проверенный ответ модели. carQuery заполнен при search_cars, ticket — при create_ticket / offer_ticket. */
public record AiModelReply(String reply, AiAction action, CarSearchPort.CarSearchQuery carQuery, AiTicketDraft ticket) {}
