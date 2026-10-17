package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.AdminUserQueryRepository;
import com.hutka.backend.adminapi.AdminUserRepository;
import com.hutka.backend.adminapi.AdminUserSpecifications;
import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.AdminRatingItem;
import com.hutka.backend.adminapi.dto.AdminUserDetailResponse;
import com.hutka.backend.adminapi.dto.AdminUserSummary;
import com.hutka.backend.auth.User;
import com.hutka.backend.auth.enums.VerificationStatus;
import com.hutka.backend.auth.service.SessionInvalidationService;
import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.BookingSpecifications;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.ratings.Rating;
import com.hutka.backend.ratings.RatingRepository;
import com.hutka.backend.ratings.RatingStats;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Раздел 16.2: список пользователей с фильтрами, профиль с историей и отзывами, блокировка/разблокировка.
 * Ручная верификация ВУ остаётся в AdminUserService (license-requests, approve, reject).
 * Блокировка бессрочная, причина обязательна; вход и подтверждение email для заблокированного закрыты (AuthService),
 * уже выданные JWT гасятся через SessionInvalidationService — тем же механизмом, что смена пароля (3.3).
 */
@Service
@RequiredArgsConstructor
public class AdminUserDirectoryService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int RECENT_RATINGS = 10;

    private final AdminUserQueryRepository query;
    private final AdminUserRepository users;
    private final BookingRepository bookings;
    private final CarRepository cars;
    private final RatingRepository ratings;
    private final SessionInvalidationService sessions;

    @Transactional(readOnly = true)
    public AdminPage<AdminUserSummary> list(VerificationStatus status, Boolean partner, Boolean blocked, String q,
                                            int page, int size) {
        Page<User> result = query.findAll(AdminUserSpecifications.filter(status, partner, blocked, q),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                        Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"))));
        return new AdminPage<>(result.getTotalElements(), result.getContent().stream().map(AdminUserDirectoryService::summary).toList());
    }

    @Transactional(readOnly = true)
    public AdminUserDetailResponse get(UUID userId) {
        return detail(load(userId));
    }

    @Transactional(readOnly = true)
    public AdminPage<AdminRatingItem> ratings(UUID userId, int page, int size) {
        load(userId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        List<Rating> items = ratings.findByToUserIdOrderByCreatedAtDesc(userId, pageable);
        return new AdminPage<>(count(ratings.statsForUser(userId)), toItems(items));
    }

    @Transactional
    public AdminUserDetailResponse block(UUID adminId, UUID userId, String reason) {
        User user = lock(userId);
        if (user.isBlocked()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Пользователь уже заблокирован");
        }
        user.setBlocked(true);
        user.setBlockedReason(reason.trim());
        user.setBlockedAt(Instant.now());
        user.setBlockedByAdminId(adminId);
        // токены гасим после commit: до него заблокированный мог бы успеть войти и получить свежий JWT
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                sessions.invalidateAllSessions(userId);
            }
        });
        return detail(user);
    }

    @Transactional
    public AdminUserDetailResponse unblock(UUID userId) {
        User user = lock(userId);
        if (!user.isBlocked()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Пользователь не заблокирован");
        }
        user.setBlocked(false);
        user.setBlockedReason(null);
        user.setBlockedAt(null);
        user.setBlockedByAdminId(null);
        return detail(user);
    }

    private User load(UUID userId) {
        return query.findById(userId).orElseThrow(AdminUserDirectoryService::notFound);
    }

    private User lock(UUID userId) {
        return users.findByIdForUpdate(userId).orElseThrow(AdminUserDirectoryService::notFound);
    }

    private AdminUserDetailResponse detail(User u) {
        long total = bookings.count(BookingSpecifications.renter(u.getId()));
        long finished = bookings.count(BookingSpecifications.renter(u.getId())
                .and(BookingSpecifications.status(BookingStatus.finished)));
        long cancelled = bookings.count(BookingSpecifications.renter(u.getId())
                .and(BookingSpecifications.status(BookingStatus.cancelled)));
        long carsCount = cars.findIdsByPartnerId(u.getId()).size();
        RatingStats stats = ratings.statsForUser(u.getId());
        List<AdminRatingItem> recent = toItems(ratings.findByToUserIdOrderByCreatedAtDesc(u.getId(),
                PageRequest.of(0, RECENT_RATINGS)));
        return new AdminUserDetailResponse(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(),
                u.isEmailVerified(), u.getPhone(), u.getBirthDate(), u.getVerificationStatus(), u.getLicenseNumber(),
                u.getLicenseIssueDate(), u.getLicenseRejectionReason(), u.isPartner(), u.isBlocked(),
                u.getBlockedReason(), u.getBlockedAt(), u.getBlockedByAdminId(), u.getRatingAvg(), u.getCreatedAt(),
                new AdminUserDetailResponse.Stats(total, finished, cancelled, carsCount, count(stats)), recent);
    }

    private List<AdminRatingItem> toItems(List<Rating> items) {
        Map<UUID, User> authors = users.findByIdIn(items.stream().map(Rating::getFromUserId).distinct().toList()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return items.stream().map(r -> {
            User author = authors.get(r.getFromUserId());
            return new AdminRatingItem(r.getId(), r.getBookingId(), r.getFromUserId(),
                    author == null ? null : author.getFirstName() + " " + author.getLastName(),
                    r.getToCarId(), r.getScore(), r.getComment(), r.getCreatedAt());
        }).toList();
    }

    private static long count(RatingStats stats) {
        return stats == null || stats.getRatingsCount() == null ? 0 : stats.getRatingsCount();
    }

    private static AdminUserSummary summary(User u) {
        return new AdminUserSummary(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getPhone(),
                u.getVerificationStatus(), u.isPartner(), u.isBlocked(), u.getBlockedReason(), u.getRatingAvg(),
                u.getCreatedAt());
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден");
    }
}
