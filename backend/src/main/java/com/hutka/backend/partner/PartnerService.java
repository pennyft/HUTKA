package com.hutka.backend.partner;

import com.hutka.backend.exception.BadRequestException;
import com.hutka.backend.exception.ConflictException;
import com.hutka.backend.exception.ForbiddenException;
import com.hutka.backend.exception.NotFoundException;
import com.hutka.backend.partner.dto.PartnerApplicationRequest;
import com.hutka.backend.partner.dto.PartnerApplicationResponse;
import com.hutka.backend.partner.entity.PartnerApplication;
import com.hutka.backend.partner.enums.ApplicationStatus;
import com.hutka.backend.partner.enums.PartnerType;
import com.hutka.backend.partner.repository.PartnerApplicationRepository;
import com.hutka.backend.user.User;
import com.hutka.backend.user.UserRepository;
import com.hutka.backend.user.UserRole;
import com.hutka.backend.user.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PartnerService {

    private static final int MAX_REJECTIONS = 3;

    private final PartnerApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    // ───── ПОЛЬЗОВАТЕЛЬ ─────

    public PartnerApplicationResponse apply(PartnerApplicationRequest request, User user) {
        if (user.getRole() == UserRole.PARTNER || user.getRole() == UserRole.ADMIN) {
            throw new BadRequestException("You are already a partner or admin");
        }

        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new ForbiddenException("Your account has been blocked due to too many rejected applications");
        }

        // Блокируем если есть активная заявка (PENDING или APPROVED)
        boolean hasActiveApplication = applicationRepository.existsByUserIdAndStatusIn(
                user.getId(),
                List.of(ApplicationStatus.PENDING, ApplicationStatus.APPROVED)
        );

        if (hasActiveApplication) {
            throw new ConflictException("You already have an active application");
        }

        // Проверяем количество отказов — при 3 блокируем аккаунт
        long rejectionCount = applicationRepository.countByUserIdAndStatus(
                user.getId(), ApplicationStatus.REJECTED
        );

        if (rejectionCount >= MAX_REJECTIONS) {
            user.setStatus(UserStatus.BLOCKED);
            userRepository.save(user);
            throw new ForbiddenException("Your account has been blocked due to too many rejected applications");
        }

        if (!request.isTermsAccepted()) {
            throw new BadRequestException("You must accept the terms");
        }

        if (request.getPartnerType() == PartnerType.INDIVIDUAL && request.getPassportNumber() == null) {
            throw new BadRequestException("Passport number is required for individuals");
        }

        if (request.getPartnerType() == PartnerType.LEGAL_ENTITY &&
                (request.getCompanyName() == null || request.getTaxNumber() == null)) {
            throw new BadRequestException("Company name and tax number are required for legal entities");
        }

        PartnerApplication application = PartnerApplication.builder()
                .user(user)
                .partnerType(request.getPartnerType())
                .passportNumber(request.getPassportNumber())
                .companyName(request.getCompanyName())
                .taxNumber(request.getTaxNumber())
                .termsAccepted(request.isTermsAccepted())
                .status(ApplicationStatus.PENDING)
                .build();

        applicationRepository.save(application);
        return toApplicationResponse(application);
    }

    public PartnerApplicationResponse getMyApplication(UUID userId) {
        PartnerApplication application = applicationRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Application not found"));
        return toApplicationResponse(application);
    }

    // ───── МОДЕРАТОР ─────

    public List<PartnerApplicationResponse> getApplicationsByStatus(ApplicationStatus status) {
        return applicationRepository.findByStatus(status)
                .stream()
                .map(this::toApplicationResponse)
                .toList();
    }

    public PartnerApplicationResponse approveApplication(UUID applicationId, User moderator) {
        PartnerApplication application = getApplicationOrThrow(applicationId);

        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new BadRequestException("Application is not pending");
        }

        application.setStatus(ApplicationStatus.APPROVED);
        application.setReviewedBy(moderator);
        applicationRepository.save(application);

        User user = application.getUser();
        user.setRole(UserRole.PARTNER);
        userRepository.save(user);

        return toApplicationResponse(application);
    }

    public PartnerApplicationResponse rejectApplication(UUID applicationId, String reason, User moderator) {
        PartnerApplication application = getApplicationOrThrow(applicationId);

        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new BadRequestException("Application is not pending");
        }

        application.setStatus(ApplicationStatus.REJECTED);
        application.setRejectionReason(reason);
        application.setReviewedBy(moderator);
        applicationRepository.save(application);

        // Проверяем количество отказов — при достижении 3 блокируем аккаунт
        long rejectionCount = applicationRepository.countByUserIdAndStatus(
                application.getUser().getId(), ApplicationStatus.REJECTED
        );

        if (rejectionCount >= MAX_REJECTIONS) {
            User user = application.getUser();
            user.setStatus(UserStatus.BLOCKED);
            userRepository.save(user);
        }

        return toApplicationResponse(application);
    }

    // ───── ПРИВАТНЫЕ МЕТОДЫ ─────

    private PartnerApplication getApplicationOrThrow(UUID applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found"));
    }

    private PartnerApplicationResponse toApplicationResponse(PartnerApplication application) {
        PartnerApplicationResponse response = new PartnerApplicationResponse();
        response.setId(application.getId());
        response.setUserId(application.getUser().getId());
        response.setPartnerType(application.getPartnerType());
        response.setPassportNumber(application.getPassportNumber());
        response.setCompanyName(application.getCompanyName());
        response.setTaxNumber(application.getTaxNumber());
        response.setTermsAccepted(application.isTermsAccepted());
        response.setStatus(application.getStatus());
        response.setRejectionReason(application.getRejectionReason());
        response.setReviewedById(application.getReviewedBy() != null ? application.getReviewedBy().getId() : null);
        response.setCreatedAt(application.getCreatedAt());
        response.setUpdatedAt(application.getUpdatedAt());
        return response;
    }
}