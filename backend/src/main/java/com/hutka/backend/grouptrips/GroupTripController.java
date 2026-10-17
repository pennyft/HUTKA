package com.hutka.backend.grouptrips;

import com.hutka.backend.grouptrips.dto.ChatMessageListResponse;
import com.hutka.backend.grouptrips.dto.CreateGroupTripRequest;
import com.hutka.backend.grouptrips.dto.GroupTripDetailResponse;
import com.hutka.backend.grouptrips.dto.GroupTripListResponse;
import com.hutka.backend.grouptrips.enums.GroupTripStatus;
import com.hutka.backend.grouptrips.service.GroupTripChatService;
import com.hutka.backend.grouptrips.service.GroupTripService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Раздел 23.5: групповые поездки. Принципал — UUID пользователя из JwtAuthFilter. GET /group-trips и GET /group-trips/:id
 * в таблице 23.5 нет, но без них пользователи не «видят открытые поездки в списке» (8) и не могут выбрать, куда вступить.
 * Чат в реальном времени — GroupTripChatController (STOMP); история чата — здесь, как в 23.5.
 */
@RestController
@RequestMapping("/group-trips")
@RequiredArgsConstructor
public class GroupTripController {

    private final GroupTripService tripService;
    private final GroupTripChatService chatService;

    @PostMapping
    public ResponseEntity<GroupTripDetailResponse> create(@AuthenticationPrincipal UUID userId,
                                                          @Valid @RequestBody CreateGroupTripRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tripService.create(userId, request));
    }

    /** mine=false — общий список (open и closed от сегодняшнего дня); mine=true — все мои поездки в любом статусе. */
    @GetMapping
    public GroupTripListResponse list(@AuthenticationPrincipal UUID userId,
                                      @RequestParam(defaultValue = "false") boolean mine,
                                      @RequestParam(required = false) GroupTripStatus status,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size) {
        return tripService.list(userId, mine, status, page, size);
    }

    @GetMapping("/{id}")
    public GroupTripDetailResponse details(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return tripService.get(userId, id);
    }

    @PostMapping("/{id}/join")
    public GroupTripDetailResponse join(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return tripService.join(userId, id);
    }

    @PatchMapping("/{id}/close")
    public GroupTripDetailResponse close(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return tripService.close(userId, id);
    }

    @PostMapping("/{id}/cancel")
    public GroupTripDetailResponse cancel(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return tripService.cancel(userId, id);
    }

    /** История чата, новые сверху (page = 0 — самые свежие), по умолчанию 50 сообщений на страницу. */
    @GetMapping("/{id}/messages")
    public ChatMessageListResponse messages(@AuthenticationPrincipal UUID userId, @PathVariable UUID id,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "50") int size) {
        return chatService.history(userId, id, page, size);
    }
}
