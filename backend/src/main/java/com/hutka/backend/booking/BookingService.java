package com.hutka.backend.booking;

import com.hutka.backend.booking.dto.BookingRequest;
import com.hutka.backend.booking.dto.BookingResponse;
import com.hutka.backend.booking.entity.Booking;
import com.hutka.backend.booking.entity.BookingPhoto;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.booking.enums.PhotoType;
import com.hutka.backend.booking.repository.BookingPhotoRepository;
import com.hutka.backend.booking.repository.BookingRepository;
import com.hutka.backend.car.entity.Car;
import com.hutka.backend.car.enums.BookingMode;
import com.hutka.backend.car.enums.CarStatus;
import com.hutka.backend.car.repository.CarRepository;
import com.hutka.backend.exception.BadRequestException;
import com.hutka.backend.exception.ForbiddenException;
import com.hutka.backend.exception.NotFoundException;
import com.hutka.backend.user.User;
import com.hutka.backend.user.UserRole;
import com.hutka.backend.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingPhotoRepository bookingPhotoRepository;
    private final CarRepository carRepository;
    private final UserService userService;

    // ───── ПОЛЬЗОВАТЕЛЬ ─────

    public BookingResponse createBooking(BookingRequest request, UUID renterId) {
        Car car = carRepository.findById(request.getCarId())
                .orElseThrow(() -> new NotFoundException("Car not found"));

        if (car.getStatus() != CarStatus.ACTIVE) {
            throw new BadRequestException("Car is not available");
        }

        boolean hasConflict = bookingRepository
                .existsByCarIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                        car.getId(),
                        List.of(BookingStatus.CONFIRMED, BookingStatus.ACTIVE),
                        request.getEndTime(),
                        request.getStartTime()
                );

        if (hasConflict) {
            throw new BadRequestException("Car is already booked for this period");
        }

        User renter = userService.findById(renterId);

        long minutes = Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();
        BigDecimal totalPrice = car.getPricePerHour()
                .multiply(BigDecimal.valueOf(minutes))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);

        if (renter.isHasPddDiscount()) {
            totalPrice = totalPrice.multiply(BigDecimal.valueOf(0.90))
                    .setScale(2, RoundingMode.HALF_UP);
            renter.setHasPddDiscount(false);
            userService.save(renter);
        }

        BookingStatus initialStatus = car.getBookingMode() == BookingMode.INSTANT
                ? BookingStatus.CONFIRMED
                : BookingStatus.PENDING;

        Booking booking = Booking.builder()
                .car(car)
                .renter(renter)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .totalPrice(totalPrice)
                .status(initialStatus)
                .build();

        bookingRepository.save(booking);
        return toBookingResponse(booking);
    }

    public void cancelBookingByRenter(UUID bookingId, UUID renterId, String reason) {
        Booking booking = getBookingOrThrow(bookingId);

        if (!booking.getRenter().getId().equals(renterId)) {
            throw new ForbiddenException("Access denied");
        }

        if (booking.getStatus() == BookingStatus.ACTIVE ||
                booking.getStatus() == BookingStatus.COMPLETED) {
            throw new BadRequestException("Cannot cancel this booking");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelReason(reason);
        bookingRepository.save(booking);
    }

    public BookingResponse startTrip(UUID bookingId, UUID renterId) {
        Booking booking = getBookingOrThrow(bookingId);

        if (!booking.getRenter().getId().equals(renterId)) {
            throw new ForbiddenException("Access denied");
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Booking is not confirmed");
        }

        boolean noBeforePhoto = bookingPhotoRepository
                .findByBookingIdAndPhotoType(bookingId, PhotoType.BEFORE)
                .isEmpty();
        if (noBeforePhoto) {
            throw new BadRequestException("Before photos required to start the trip");
        }

        booking.setStatus(BookingStatus.ACTIVE);
        bookingRepository.save(booking);
        return toBookingResponse(booking);
    }

    public BookingResponse completeTrip(UUID bookingId, UUID renterId) {
        Booking booking = getBookingOrThrow(bookingId);

        if (!booking.getRenter().getId().equals(renterId)) {
            throw new ForbiddenException("Access denied");
        }

        if (booking.getStatus() != BookingStatus.ACTIVE) {
            throw new BadRequestException("Booking is not active");
        }

        boolean noAfterPhoto = bookingPhotoRepository
                .findByBookingIdAndPhotoType(bookingId, PhotoType.AFTER)
                .isEmpty();
        if (noAfterPhoto) {
            throw new BadRequestException("After photos required to complete the trip");
        }

        booking.setStatus(BookingStatus.COMPLETED);
        bookingRepository.save(booking);
        return toBookingResponse(booking);
    }

    public BookingResponse getBookingById(UUID bookingId, User requestingUser) {
        Booking booking = getBookingOrThrow(bookingId);

        boolean isAdmin = requestingUser.getRole() == UserRole.ADMIN;
        boolean isRenter = booking.getRenter().getId().equals(requestingUser.getId());
        boolean isOwner = booking.getCar().getOwner().getId().equals(requestingUser.getId());

        if (!isAdmin && !isRenter && !isOwner) {
            throw new ForbiddenException("Access denied");
        }

        return toBookingResponse(booking);
    }

    public List<BookingResponse> getMyBookings(UUID renterId) {
        return bookingRepository.findByRenterId(renterId)
                .stream()
                .map(this::toBookingResponse)
                .toList();
    }

    // ───── ПАРТНЁР ─────

    public BookingResponse confirmBooking(UUID bookingId, UUID ownerId) {
        Booking booking = getBookingOrThrow(bookingId);

        if (!booking.getCar().getOwner().getId().equals(ownerId)) {
            throw new ForbiddenException("Access denied");
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Booking is not pending");
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        bookingRepository.save(booking);
        return toBookingResponse(booking);
    }

    public BookingResponse rejectBooking(UUID bookingId, UUID ownerId, String reason) {
        Booking booking = getBookingOrThrow(bookingId);

        if (!booking.getCar().getOwner().getId().equals(ownerId)) {
            throw new ForbiddenException("Access denied");
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Booking is not pending");
        }

        booking.setStatus(BookingStatus.REJECTED);
        booking.setCancelReason(reason);
        bookingRepository.save(booking);
        return toBookingResponse(booking);
    }

    public void cancelBookingByPartner(UUID bookingId, UUID ownerId, String reason) {
        Booking booking = getBookingOrThrow(bookingId);

        if (!booking.getCar().getOwner().getId().equals(ownerId)) {
            throw new ForbiddenException("Access denied");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelReason(reason);
        bookingRepository.save(booking);
    }

    public List<BookingResponse> getBookingsByCar(UUID carId) {
        return bookingRepository.findByCarId(carId)
                .stream()
                .map(this::toBookingResponse)
                .toList();
    }

    // ───── ФОТО ─────

    public void addPhoto(UUID bookingId, UUID renterId, String url, PhotoType photoType) {
        Booking booking = getBookingOrThrow(bookingId);

        if (!booking.getRenter().getId().equals(renterId)) {
            throw new ForbiddenException("Access denied");
        }

        BookingPhoto photo = BookingPhoto.builder()
                .booking(booking)
                .url(url)
                .photoType(photoType)
                .build();

        bookingPhotoRepository.save(photo);
    }

    // ───── МОДЕРАТОР ─────

    public BookingResponse updateBookingStatus(UUID bookingId, BookingStatus status) {
        Booking booking = getBookingOrThrow(bookingId);
        booking.setStatus(status);
        bookingRepository.save(booking);
        return toBookingResponse(booking);
    }

    // ───── ПРИВАТНЫЕ МЕТОДЫ ─────

    private Booking getBookingOrThrow(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));
    }

    private BookingResponse toBookingResponse(Booking booking) {
        BookingResponse response = new BookingResponse();
        response.setId(booking.getId());
        response.setCarId(booking.getCar().getId());
        response.setCarBrand(booking.getCar().getBrand());
        response.setCarModel(booking.getCar().getModel());
        response.setRenterId(booking.getRenter().getId());
        response.setStartTime(booking.getStartTime());
        response.setEndTime(booking.getEndTime());
        response.setTotalPrice(booking.getTotalPrice());
        response.setStatus(booking.getStatus());
        response.setCancelReason(booking.getCancelReason());
        response.setCreatedAt(booking.getCreatedAt());
        response.setBeforePhotoUrls(
                booking.getPhotos().stream()
                        .filter(p -> p.getPhotoType() == PhotoType.BEFORE)
                        .map(BookingPhoto::getUrl)
                        .toList()
        );
        response.setAfterPhotoUrls(
                booking.getPhotos().stream()
                        .filter(p -> p.getPhotoType() == PhotoType.AFTER)
                        .map(BookingPhoto::getUrl)
                        .toList()
        );
        return response;
    }
}