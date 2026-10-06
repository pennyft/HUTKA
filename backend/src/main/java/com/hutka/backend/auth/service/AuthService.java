package com.hutka.backend.auth.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.auth.enums.VerificationStatus;
import com.hutka.backend.auth.dto.*;
import com.hutka.backend.auth.jwt.JwtService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDate;
import java.time.Period;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MIN_AGE = 18;

    private static final int LOGIN_MAX_ATTEMPTS = 10;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);
    private static final int RESEND_MAX_ATTEMPTS = 3;
    private static final Duration RESEND_WINDOW = Duration.ofMinutes(10);
    private static final int FORGOT_MAX_ATTEMPTS = 3;
    private static final Duration FORGOT_WINDOW = Duration.ofHours(1);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final VerificationCodeService verificationCodeService;
    private final PasswordResetService passwordResetService;
    private final SessionInvalidationService sessionInvalidationService;
    private final RateLimitService rateLimitService;
    private final EmailService emailService;
    private final JwtService jwtService;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    /** Хэш-заглушка: login сравнивает пароль и для несуществующего email, чтобы время ответа не выдавало, есть ли аккаунт. */
    private String dummyPasswordHash;

    @PostConstruct
    void initDummyHash() {
        dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    /** Email хранится и ищется в нижнем регистре, иначе A@x.com и a@x.com — два разных аккаунта. */
    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Без @Transactional намеренно: сохранение пользователя — отдельная короткая транзакция,
     * а отправка письма (сетевой вызов) происходит уже после коммита и не держит соединение с БД.
     * Если письмо не ушло — аккаунт остаётся, код можно запросить через /auth/resend-code (раздел 3.1).
     */
    public void register(RegisterRequest request) {
        String email = normalize(request.email());

        int age = Period.between(request.birthDate(), LocalDate.now()).getYears();
        if (age < MIN_AGE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Регистрация доступна только с " + MIN_AGE + " лет");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email уже зарегистрирован");
        }

        User user = User.builder()
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .email(email)
                .phone(request.phone().trim())
                .birthDate(request.birthDate())
                .passwordHash(passwordEncoder.encode(request.password()))
                .emailVerified(false)
                .verificationStatus(VerificationStatus.unverified)
                .partner(false)
                .build();

        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // гонка: два запроса с одним email прошли existsByEmail одновременно
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email уже зарегистрирован");
        }

        sendVerificationCode(email);
    }

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        String email = normalize(request.email());

        if (!verificationCodeService.verify(email, request.code())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Неверный или истёкший код");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Неверный или истёкший код"));
        user.setEmailVerified(true);
        userRepository.save(user);

        return AuthResponse.bearer(jwtService.generateToken(user.getId(), user.getEmail()));
    }

    /**
     * Всегда завершается без ошибки: неизвестный email и уже подтверждённый email
     * неотличимы от успешной отправки — иначе endpoint раскрывает список зарегистрированных адресов.
     */
    public void resendCode(String email) {
        String normalized = normalize(email);
        rateLimitService.check("resend-code:" + normalized, RESEND_MAX_ATTEMPTS, RESEND_WINDOW);

        userRepository.findByEmail(normalized)
                .filter(user -> !user.isEmailVerified())
                .ifPresent(user -> sendVerificationCode(normalized));
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalize(request.email());
        String limitKey = "login:" + email;
        rateLimitService.check(limitKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW);

        User user = userRepository.findByEmail(email).orElse(null);

        String hashToCheck = user != null ? user.getPasswordHash() : dummyPasswordHash;
        boolean passwordOk = passwordEncoder.matches(request.password(), hashToCheck);

        if (user == null || !passwordOk) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Неверный email или пароль");
        }
        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Подтвердите email перед входом");
        }

        rateLimitService.reset(limitKey);
        return AuthResponse.bearer(jwtService.generateToken(user.getId(), user.getEmail()));
    }

    @Transactional
    public void submitLicense(UUID userId, LicenseRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));

        // Повторная подача не должна сбрасывать уже подтверждённый статус в pending
        if (user.getVerificationStatus() == VerificationStatus.verified) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Водительское удостоверение уже подтверждено");
        }
        if (request.licenseIssueDate().isBefore(user.getBirthDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Дата выдачи не может быть раньше даты рождения");
        }

        user.setLicenseNumber(request.licenseNumber().trim());
        user.setLicenseIssueDate(request.licenseIssueDate());
        user.setVerificationStatus(VerificationStatus.pending);
        userRepository.save(user);
    }

    /**
     * Ответ одинаков для существующего и несуществующего email, включая сбой SMTP:
     * ошибка отправки логируется, но наружу не пробрасывается.
     */
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = normalize(request.email());
        rateLimitService.check("forgot-password:" + email, FORGOT_MAX_ATTEMPTS, FORGOT_WINDOW);

        userRepository.findByEmail(email).ifPresent(user -> {
            try {
                String token = passwordResetService.generateToken(user.getEmail());
                String resetLink = frontendBaseUrl + "/reset-password?token=" + token;
                emailService.sendPasswordResetLink(user.getEmail(), resetLink);
            } catch (RuntimeException e) {
                log.error("Не удалось отправить письмо восстановления пароля", e);
            }
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String email = passwordResetService.consumeToken(request.token());
        if (email == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ссылка недействительна или истёк срок действия");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        sessionInvalidationService.invalidateAllSessions(user.getId());
    }

    private void sendVerificationCode(String email) {
        String code = verificationCodeService.generateAndStore(email);
        emailService.sendVerificationCode(email, code);
    }
}
