package com.hutka.backend.booking;

import com.hutka.backend.booking.dto.BookingRequest;
import com.hutka.backend.booking.dto.BookingResponse;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.booking.enums.PhotoType;
import com.hutka.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // ───── ПОЛЬЗОВАТЕЛЬ ─────

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(
            @RequestBody BookingRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bookingService.createBooking(request, user.getId()));
    }

    @PatchMapping("/{bookingId}/cancel")
    public ResponseEntity<Void> cancelByRenter(
            @PathVariable UUID bookingId,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal User user) {
        bookingService.cancelBookingByRenter(bookingId, user.getId(), reason);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{bookingId}/start")
    public ResponseEntity<BookingResponse> startTrip(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bookingService.startTrip(bookingId, user.getId()));
    }

    @PatchMapping("/{bookingId}/complete")
    public ResponseEntity<BookingResponse> completeTrip(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bookingService.completeTrip(bookingId, user.getId()));
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<BookingResponse> getBookingById(@PathVariable UUID bookingId) {
        return ResponseEntity.ok(bookingService.getBookingById(bookingId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<BookingResponse>> getMyBookings(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bookingService.getMyBookings(user.getId()));
    }

    // ───── ФОТО ─────

    @PostMapping("/{bookingId}/photos")
    public ResponseEntity<Void> addPhoto(
            @PathVariable UUID bookingId,
            @RequestParam String url,
            @RequestParam PhotoType photoType,
            @AuthenticationPrincipal User user) {
        bookingService.addPhoto(bookingId, user.getId(), url, photoType);
        return ResponseEntity.noContent().build();
    }

    // ───── ПАРТНЁР ─────

    @PatchMapping("/{bookingId}/confirm")
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    public ResponseEntity<BookingResponse> confirmBooking(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bookingService.confirmBooking(bookingId, user.getId()));
    }

    @PatchMapping("/{bookingId}/reject")
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    public ResponseEntity<BookingResponse> rejectBooking(
            @PathVariable UUID bookingId,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bookingService.rejectBooking(bookingId, user.getId(), reason));
    }

    @PatchMapping("/{bookingId}/cancel-partner")
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    public ResponseEntity<Void> cancelByPartner(
            @PathVariable UUID bookingId,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal User user) {
        bookingService.cancelBookingByPartner(bookingId, user.getId(), reason);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/car/{carId}")
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    public ResponseEntity<List<BookingResponse>> getBookingsByCar(@PathVariable UUID carId) {
        return ResponseEntity.ok(bookingService.getBookingsByCar(carId));
    }

    // ───── МОДЕРАТОР ─────

    @PatchMapping("/admin/{bookingId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookingResponse> updateStatus(
            @PathVariable UUID bookingId,
            @RequestParam BookingStatus status) {
        return ResponseEntity.ok(bookingService.updateBookingStatus(bookingId, status));
    }
}
