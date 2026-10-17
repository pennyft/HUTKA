package com.hutka.backend.booking;

import com.hutka.backend.booking.agreement.AgreementService;
import com.hutka.backend.booking.dto.*;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.booking.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Раздел 23.3 + approve/decline партнёра (6.1, 10.4). Принципал — UUID пользователя из JwtAuthFilter. */
@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final AgreementService agreementService;

    @PostMapping
    public ResponseEntity<BookingResponse> create(@AuthenticationPrincipal UUID userId,
                                                  @Valid @RequestBody CreateBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.create(userId, request));
    }

    /** Мои брони как арендатора, опционально по статусу. */
    @GetMapping
    public List<BookingResponse> myBookings(@AuthenticationPrincipal UUID userId,
                                            @RequestParam(required = false) BookingStatus status) {
        return bookingService.findForRenter(userId, status);
    }

    @GetMapping("/{id}")
    public BookingResponse get(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return bookingService.findById(userId, id);
    }

    @PostMapping("/{id}/approve")
    public BookingResponse approve(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return bookingService.approve(userId, id);
    }

    @PostMapping("/{id}/decline")
    public BookingResponse decline(@AuthenticationPrincipal UUID userId, @PathVariable UUID id,
                                   @Valid @RequestBody DeclineBookingRequest request) {
        return bookingService.decline(userId, id, request.reason());
    }

    @PostMapping("/{id}/start")
    public BookingResponse start(@AuthenticationPrincipal UUID userId, @PathVariable UUID id,
                                 @Valid @RequestBody StartTripRequest request) {
        return bookingService.start(userId, id, request.photosBefore());
    }

    @PostMapping("/{id}/finish")
    public BookingResponse finish(@AuthenticationPrincipal UUID userId, @PathVariable UUID id,
                                  @Valid @RequestBody FinishTripRequest request) {
        return bookingService.finish(userId, id, request.photosAfter());
    }

    /** Раздел 6.6 / 23.3: повторное скачивание PDF-договора после завершения поездки (арендатор или партнёр). */
    @GetMapping("/{id}/agreement")
    public ResponseEntity<byte[]> agreement(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        byte[] pdf = agreementService.getPdf(userId, id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("hutka-agreement-" + id + ".pdf").build().toString())
                .body(pdf);
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancel(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return bookingService.cancel(userId, id);
    }
}
