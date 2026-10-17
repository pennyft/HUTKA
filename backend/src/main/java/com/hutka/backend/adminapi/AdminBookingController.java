package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.dto.AdminBookingDetailResponse;
import com.hutka.backend.adminapi.dto.AdminBookingSummary;
import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.service.AdminBookingService;
import com.hutka.backend.booking.enums.BookingStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;

import java.time.Instant;
import java.util.UUID;

/** Раздел 16.4: просмотр всех бронирований (только чтение). from/to — по плановому началу поездки, ISO-8601. */
@RestController
@RequestMapping("/admin/bookings")
@RequiredArgsConstructor
public class AdminBookingController {

    private final AdminBookingService bookingService;

    @GetMapping
    public AdminPage<AdminBookingSummary> list(@RequestParam(required = false) BookingStatus status,
                                               @RequestParam(required = false) UUID carId,
                                               @RequestParam(required = false) UUID renterId,
                                               @RequestParam(required = false) UUID userId,
                                               @RequestParam(required = false) Instant from,
                                               @RequestParam(required = false) Instant to,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return bookingService.list(status, carId, renterId, userId, from, to, page, size);
    }

    @GetMapping("/{id}")
    public AdminBookingDetailResponse details(@PathVariable UUID id) {
        return bookingService.get(id);
    }

    @PostMapping("/{id}/force-close")
    public AdminBookingDetailResponse forceClose(@PathVariable UUID id) {
        return bookingService.forceClose(id);
    }
}
