package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.AdminUserRepository;
import com.hutka.backend.adminapi.dto.AdminLicenseRequestResponse;
import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.auth.User;
import com.hutka.backend.auth.enums.VerificationStatus;
import com.hutka.backend.notifications.enums.NotificationType;
import com.hutka.backend.notifications.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

/**
 * Раздел 3.2 и 16.2: ручная верификация водительского удостоверения.
 * Отклонённая заявка возвращает пользователя в unverified (отдельного статуса rejected в разделе 22.3 нет),
 * причина сохраняется в users.license_rejection_reason и уходит пользователю уведомлением.
 */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final int MAX_PAGE_SIZE = 100;

    private final AdminUserRepository users;
    private final NotificationService notifications;

    /** Очередь на проверку: статус pending, самые давние регистрации первыми (даты подачи заявки в модели данных нет). */
    @Transactional(readOnly = true)
    public AdminPage<AdminLicenseRequestResponse> licenseRequests(int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        return new AdminPage<>(
                users.countByVerificationStatus(VerificationStatus.pending),
                users.findByVerificationStatusOrderByCreatedAtAsc(VerificationStatus.pending, pageable).stream()
                        .map(AdminUserService::toResponse).toList());
    }

    @Transactional
    public AdminLicenseRequestResponse approveLicense(UUID userId) {
        User user = lockPending(userId);
        user.setVerificationStatus(VerificationStatus.verified);
        user.setLicenseRejectionReason(null);
        notifications.send(user.getId(), NotificationType.license_approved, Map.of());
        return toResponse(user);
    }

    @Transactional
    public AdminLicenseRequestResponse rejectLicense(UUID userId, String reason) {
        User user = lockPending(userId);
        String trimmed = reason.trim();
        user.setVerificationStatus(VerificationStatus.unverified);
        user.setLicenseRejectionReason(trimmed);
        notifications.send(user.getId(), NotificationType.license_rejected, Map.of("reason", trimmed));
        return toResponse(user);
    }

    private User lockPending(UUID userId) {
        User user = users.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
        if (user.getVerificationStatus() != VerificationStatus.pending) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Заявка не находится на рассмотрении");
        }
        return user;
    }

    private static AdminLicenseRequestResponse toResponse(User u) {
        return new AdminLicenseRequestResponse(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getPhone(),
                u.getBirthDate(), u.getLicenseNumber(), u.getLicenseIssueDate(), u.getVerificationStatus(),
                u.getLicenseRejectionReason(), u.getCreatedAt());
    }
}
