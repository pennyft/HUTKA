package com.hutka.backend.partner;

import com.hutka.backend.booking.dto.BookingResponse;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.booking.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Раздел 10.4 / 23.6: все входящие брони по машинам партнёра. Показывает только брони его собственных машин. */
@RestController
@RequestMapping("/partner/bookings")
@RequiredArgsConstructor
public class PartnerBookingController {

    private final BookingService bookingService;

    @GetMapping
    public List<BookingResponse> list(
            @AuthenticationPrincipal UUID partnerId,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) UUID carId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        return bookingService.findForPartner(partnerId, status, carId, from, to);
    }
}
