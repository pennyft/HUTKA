package com.hutka.backend.partner;

import com.hutka.backend.booking.dto.BookingResponse;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.booking.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Раздел 10.4 / 23.6: все входящие брони по машинам партнёра. Показывает только брони его собственных машин.
 * Без параметров page и size возвращается весь список (как раньше). Если передан хотя бы один из них, ответ
 * постраничный: тело — массив броней страницы, общее число по фильтру — в заголовке X-Total-Count
 * (как в каталоге машин). page — с 0, size по умолчанию 20, не более 100.
 */
@RestController
@RequestMapping("/partner/bookings")
@RequiredArgsConstructor
public class PartnerBookingController {

    static final int DEFAULT_PAGE_SIZE = 20;
    static final int MAX_PAGE_SIZE = 100;

    private final BookingService bookingService;

    @GetMapping
    public ResponseEntity<List<BookingResponse>> list(
            @AuthenticationPrincipal UUID partnerId,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) UUID carId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        if (page == null && size == null) {
            return ResponseEntity.ok(bookingService.findForPartner(partnerId, status, carId, from, to));
        }
        int safePage = Math.max(page == null ? 0 : page, 0);
        int safeSize = Math.min(Math.max(size == null ? DEFAULT_PAGE_SIZE : size, 1), MAX_PAGE_SIZE);
        Page<BookingResponse> result = bookingService.findPageForPartner(
                partnerId, status, carId, from, to, safePage, safeSize);
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(result.getTotalElements()))
                .body(result.getContent());
    }
}
