package com.hutka.backend.grouptrips;

import com.hutka.backend.grouptrips.dto.ChatErrorResponse;
import com.hutka.backend.grouptrips.dto.ChatMessageRequest;
import com.hutka.backend.grouptrips.service.GroupTripChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.converter.MessageConversionException;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.UUID;

/**
 * Раздел 8, 23.5: чат группой поездки по STOMP (WS /group-trips/:id/chat).
 * Отправка: SEND на /app/group-trips/{tripId}/chat, тело {"body": "..."}.
 * Получение: подписка на /user/queue/group-trips/{tripId}/chat — сообщение приходит всем участникам, включая отправителя.
 * Ошибки (не участник, поездка завершена, пустой текст) приходят только отправителю в /user/queue/errors.
 * Принципал сессии — UUID пользователя в виде строки (его выставляет StompAuthInterceptor при CONNECT).
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class GroupTripChatController {

    private final GroupTripChatService chatService;

    @MessageMapping("/group-trips/{tripId}/chat")
    public void send(@DestinationVariable String tripId, @Payload ChatMessageRequest request, Principal principal) {
        chatService.send(userId(principal), parseTripId(tripId), request == null ? null : request.body());
    }

    @MessageExceptionHandler
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ChatErrorResponse handleError(Exception e) {
        if (e instanceof ResponseStatusException rse) {
            return new ChatErrorResponse(rse.getStatusCode().value(), rse.getReason());
        }
        if (e instanceof MessageConversionException) {
            return new ChatErrorResponse(HttpStatus.BAD_REQUEST.value(), "Некорректное сообщение");
        }
        log.error("Ошибка обработки сообщения чата групповой поездки", e);
        return new ChatErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Не удалось отправить сообщение");
    }

    private static UUID userId(Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Требуется авторизация");
        }
        try {
            return UUID.fromString(principal.getName());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Требуется авторизация");
        }
    }

    private static UUID parseTripId(String raw) {
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Некорректный идентификатор поездки");
        }
    }
}
