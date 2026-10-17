package com.hutka.backend.support.dto;

import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * POST /tickets (23.5, 14): категория, тема и описание. priority по умолчанию normal; urgent пользователь может указать сам
 * («вручную пользователем/AI при описании ситуации, требующей немедленного внимания»). audience по умолчанию renter;
 * system от клиента не принимается.
 */
public record CreateTicketRequest(
        @NotNull(message = "Укажите категорию") TicketCategory category,
        @NotBlank(message = "Укажите тему") @Size(max = 200, message = "Тема не длиннее 200 символов") String subject,
        @NotBlank(message = "Опишите проблему") @Size(max = 4000, message = "Описание не длиннее 4000 символов") String description,
        TicketPriority priority,
        TicketAudience audience) {}
