package com.hutka.backend.ai;

import com.hutka.backend.ai.dto.AiChatRequest;
import com.hutka.backend.ai.dto.AiChatResponse;
import com.hutka.backend.ai.service.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Раздел 23.11: POST /ai/chat. Принципал — UUID пользователя из JwtAuthFilter. Путь попадает под anyRequest().authenticated()
 * клиентской цепочки безопасности — SecurityConfig менять не нужно.
 */
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiChatService chatService;

    @PostMapping("/chat")
    public AiChatResponse chat(@AuthenticationPrincipal UUID userId, @Valid @RequestBody AiChatRequest request) {
        return chatService.chat(userId, request);
    }
}
