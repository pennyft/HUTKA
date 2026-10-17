package com.hutka.backend.config;

import com.hutka.backend.auth.jwt.JwtService;
import com.hutka.backend.auth.service.SessionInvalidationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Аутентификация STOMP-подключения по JWT в кадре CONNECT (раздел 3, 17.1). Браузер не может задать заголовок
 * Authorization при WebSocket-handshake, поэтому HTTP-запрос на /ws открыт (SecurityConfig), а токен проверяется здесь.
 * Логика проверки та же, что в JwtAuthFilter, включая отзыв токенов после смены пароля (раздел 3.3).
 * Принципал сессии — UUID пользователя в виде строки: именно по нему Spring адресует convertAndSendToUser.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final SessionInvalidationService sessionInvalidationService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            UUID userId = authenticate(accessor.getFirstNativeHeader("Authorization"));
            accessor.setUser(new UsernamePasswordAuthenticationToken(userId.toString(), null, List.of()));
        }
        return message;
    }

    private UUID authenticate(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessageDeliveryException("Требуется авторизация");
        }
        try {
            String token = header.substring(7);
            UUID userId = jwtService.extractUserId(token);
            Long invalidatedAtSec = sessionInvalidationService.getInvalidatedAtSec(userId);
            long issuedAtSec = jwtService.extractIssuedAt(token).getTime() / 1000;
            if (invalidatedAtSec != null && issuedAtSec <= invalidatedAtSec) {
                throw new MessageDeliveryException("Сессия недействительна");
            }
            return userId;
        } catch (MessageDeliveryException e) {
            throw e;
        } catch (Exception e) {
            // Невалидный/просроченный токен или недоступный Redis — подключение отклоняется, как и в JwtAuthFilter
            log.debug("STOMP CONNECT отклонён: {}", e.getMessage());
            throw new MessageDeliveryException("Недействительный токен");
        }
    }
}
