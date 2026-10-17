package com.hutka.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Раздел 17.1: STOMP поверх WebSocket, in-memory SimpleBroker на старте (при горизонтальном масштабировании — broker relay).
 * Подключение: ws(s)://host/ws, в кадре CONNECT заголовок Authorization: Bearer <JWT> (проверка — StompAuthInterceptor).
 * Уведомления: подписка на /user/queue/notifications. Префикс /app зарезервирован под @MessageMapping чата групповых поездок (раздел 8).
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthInterceptor stompAuthInterceptor;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // CORS из SecurityConfig на WebSocket-handshake не действует — origin задаётся здесь (тот же адрес фронтенда)
        registry.addEndpoint("/ws").setAllowedOrigins(frontendBaseUrl);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthInterceptor);
    }
}
