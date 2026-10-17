package com.hutka.backend.partner.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.partner.PartnerStatsRepository;
import com.hutka.backend.partner.dto.PartnerReviewListResponse;
import com.hutka.backend.ratings.Rating;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Раздел 10.5: «Все отзывы арендаторов в одном месте» — оценки самого партнёра и его машин (7), новые сверху.
 * Оценки публичны (7.1), поэтому имя автора — тот же firstName, что в публичном GET /ratings.
 */
@Service
@RequiredArgsConstructor
public class PartnerReviewService {

    private static final int MAX_PAGE_SIZE = 100;
    /** IN () с пустым списком недопустим, а у партнёра без машин остаются оценки на него самого. */
    private static final List<UUID> NO_CARS = List.of(new UUID(0L, 0L));

    private final PartnerStatsRepository stats;
    private final PartnerAccess access;
    private final CarRepository cars;
    private final UserRepository users;

    @Transactional(readOnly = true)
    public PartnerReviewListResponse list(UUID partnerId, int page, int size) {
        access.requirePartner(partnerId);
        List<UUID> carIds = cars.findIdsByPartnerId(partnerId);
        List<UUID> filter = carIds.isEmpty() ? NO_CARS : carIds;
        List<Rating> ratings = stats.reviews(partnerId, filter,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE)));
        long total = stats.countReviews(partnerId, filter);

        Map<UUID, String> authors = users.findAllById(ratings.stream().map(Rating::getFromUserId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, User::getFirstName));
        Map<UUID, Car> carsById = cars.findAllById(ratings.stream().map(Rating::getToCarId)
                        .filter(java.util.Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Car::getId, Function.identity()));

        List<PartnerReviewListResponse.Item> items = ratings.stream()
                .map(r -> new PartnerReviewListResponse.Item(r.getId(), r.getBookingId(), r.getToCarId(),
                        PartnerIncomeService.name(carsById.get(r.getToCarId())), r.getScore(), r.getComment(),
                        r.getCreatedAt(), authors.get(r.getFromUserId())))
                .toList();
        return new PartnerReviewListResponse(total, items);
    }
}
