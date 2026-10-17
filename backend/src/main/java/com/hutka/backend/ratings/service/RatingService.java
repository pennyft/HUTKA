package com.hutka.backend.ratings.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.BookingSpecifications;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.ratings.*;
import com.hutka.backend.ratings.dto.*;
import com.hutka.backend.ratings.enums.RatingTarget;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/** Раздел 7 и 23.9. Решения, которых нет в Hutka.md дословно, — в docs/RATINGS_DECISIONS.md. */
@Service
@RequiredArgsConstructor
public class RatingService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int PENDING_LOOKBACK = 100;

    private final RatingRepository ratings;
    private final BookingRepository bookings;
    private final CarRepository cars;
    private final UserRepository users;
    private final RatingUserLockRepository userLock;

    // ---------------------------------------------------------------- POST /ratings

    @Transactional
    public RatingResponse create(UUID authorId, CreateRatingRequest request) {
        Booking booking = bookings.findById(request.bookingId()).orElseThrow(RatingService::bookingNotFound);
        Car car = cars.findById(booking.getCarId()).orElseThrow(RatingService::bookingNotFound);

        boolean isRenter = booking.getRenterId().equals(authorId);
        boolean isPartner = car.getPartnerId().equals(authorId);
        if (!isRenter && !isPartner) {
            throw bookingNotFound(); // чужая бронь «не существует», как в BookingService
        }
        if (isRenter && isPartner) {
            throw conflict("Нельзя оценивать поездку на собственной машине");
        }
        if (booking.getStatus() != BookingStatus.finished) {
            throw conflict("Оценить можно только завершённую поездку");
        }

        UUID toUserId = null;
        UUID toCarId = null;
        if (request.target() == RatingTarget.car) {
            if (!isRenter) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Состояние машины оценивает арендатор");
            }
            toCarId = car.getId();
        } else {
            toUserId = isRenter ? car.getPartnerId() : booking.getRenterId();
        }

        // Блокировка получателя: вставка оценки и пересчёт среднего выполняются по очереди
        User lockedUser = null;
        Car lockedCar = null;
        if (toCarId != null) {
            lockedCar = cars.findByIdForUpdate(toCarId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Машина не найдена"));
        } else {
            lockedUser = userLock.findByIdForUpdate(toUserId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
        }

        boolean alreadyRated = toCarId != null
                ? ratings.existsByBookingIdAndFromUserIdAndToCarId(booking.getId(), authorId, toCarId)
                : ratings.existsByBookingIdAndFromUserIdAndToUserId(booking.getId(), authorId, toUserId);
        if (alreadyRated) {
            throw conflict("Вы уже оставили эту оценку по данной поездке");
        }

        String comment = request.comment() == null || request.comment().isBlank() ? null : request.comment().trim();
        Rating saved = ratings.save(Rating.builder()
                .bookingId(booking.getId())
                .fromUserId(authorId)
                .toUserId(toUserId)
                .toCarId(toCarId)
                .score(request.score())
                .comment(comment)
                .build());

        // 7.1: rating_avg пересчитывается при добавлении каждой новой оценки (JPQL-запрос сам сбросит вставку в БД)
        RatingStats stats = toCarId != null ? ratings.statsForCar(toCarId) : ratings.statsForUser(toUserId);
        BigDecimal average = RatingMath.average(nz(stats.getTotalScore()), nz(stats.getRatingsCount()));
        if (lockedCar != null) {
            lockedCar.setRatingAvg(average);
        } else {
            lockedUser.setRatingAvg(average);
        }

        return new RatingResponse(saved.getId(), saved.getBookingId(), request.target(), saved.getScore(),
                saved.getComment(), saved.getCreatedAt());
    }

    // ---------------------------------------------------------------- GET /ratings

    /** Публичные оценки по пользователю или машине (7.1): ровно один из userId / carId, по страницам, новые сверху. */
    @Transactional(readOnly = true)
    public RatingListResponse list(UUID userId, UUID carId, int page, int size) {
        if ((userId == null) == (carId == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Укажите ровно один параметр: userId или carId");
        }
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));

        List<Rating> items;
        RatingStats stats;
        if (userId != null) {
            if (!users.existsById(userId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден");
            }
            stats = ratings.statsForUser(userId);
            items = ratings.findByToUserIdOrderByCreatedAtDesc(userId, pageable);
        } else {
            if (!cars.existsById(carId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Машина не найдена");
            }
            stats = ratings.statsForCar(carId);
            items = ratings.findByToCarIdOrderByCreatedAtDesc(carId, pageable);
        }

        Map<UUID, String> authorNames = users.findAllById(items.stream().map(Rating::getFromUserId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, User::getFirstName));
        List<RatingItemResponse> list = items.stream()
                .map(r -> new RatingItemResponse(r.getId(), r.getScore(), r.getComment(), r.getCreatedAt(),
                        authorNames.get(r.getFromUserId())))
                .toList();

        long count = nz(stats.getRatingsCount());
        return new RatingListResponse(RatingMath.average(nz(stats.getTotalScore()), count), count, list);
    }

    // ---------------------------------------------------------------- GET /ratings/pending

    /**
     * Оценки, которые пользователь ещё должен оставить по завершённым поездкам (последние 100):
     * арендатор — партнёру и машине, партнёр — арендатору. Сами по себе они ничего не блокируют.
     */
    @Transactional(readOnly = true)
    public List<PendingRatingResponse> pending(UUID userId) {
        PageRequest latest = PageRequest.of(0, PENDING_LOOKBACK, Sort.by(Sort.Direction.DESC, "actualEndAt"));
        Specification<Booking> finished = BookingSpecifications.status(BookingStatus.finished);

        List<Booking> asRenter = bookings.findAll(BookingSpecifications.renter(userId).and(finished), latest).getContent();
        List<UUID> myCarIds = cars.findIdsByPartnerId(userId);
        List<Booking> asPartner = myCarIds.isEmpty() ? List.of()
                : bookings.findAll(BookingSpecifications.carIn(myCarIds).and(finished), latest).getContent();

        Set<UUID> renterBookingIds = asRenter.stream().map(Booking::getId).collect(Collectors.toSet());
        asPartner = asPartner.stream().filter(b -> !renterBookingIds.contains(b.getId())).toList(); // защита от «своей» брони

        Set<UUID> allIds = new HashSet<>(renterBookingIds);
        asPartner.forEach(b -> allIds.add(b.getId()));
        if (allIds.isEmpty()) {
            return List.of();
        }
        Set<String> done = ratings.findByFromUserIdAndBookingIdIn(userId, allIds).stream()
                .map(r -> key(r.getBookingId(), r.getToCarId() != null ? RatingTarget.car : RatingTarget.user))
                .collect(Collectors.toSet());

        List<PendingRatingResponse> result = new ArrayList<>();
        for (Booking b : asRenter) {
            for (RatingTarget target : RatingTarget.values()) {
                if (!done.contains(key(b.getId(), target))) {
                    result.add(new PendingRatingResponse(b.getId(), b.getCarId(), target, b.getActualEndAt()));
                }
            }
        }
        for (Booking b : asPartner) {
            if (!done.contains(key(b.getId(), RatingTarget.user))) {
                result.add(new PendingRatingResponse(b.getId(), b.getCarId(), RatingTarget.user, b.getActualEndAt()));
            }
        }
        result.sort(Comparator.comparing(PendingRatingResponse::finishedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }

    // ---------------------------------------------------------------- внутреннее

    private static String key(UUID bookingId, RatingTarget target) {
        return bookingId + ":" + target;
    }

    private static long nz(Long value) {
        return value == null ? 0 : value;
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private static ResponseStatusException bookingNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Бронирование не найдено");
    }
}
