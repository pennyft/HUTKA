package com.hutka.backend.adminapi.dto;

import java.util.UUID;

/** csrfToken клиент отправляет в заголовке X-CSRF-TOKEN со всеми POST/PATCH/DELETE (в т.ч. logout). */
public record AdminSessionResponse(UUID id, String email, String displayName, String csrfToken) {}
