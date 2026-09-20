package com.hutka.backend.auth.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.auth.dto.*;
import com.hutka.backend.auth.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.Period;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MIN_AGE = 18;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final VerificationCodeService verificationCodeService;
    private final PasswordResetService passwordResetService;
    private final SessionInvalidationService sessionInvalidationService;
    private final EmailService emailService;
    private final JwtService jwtService;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    @Transactional
    public void register(RegisterRequest request) {
        int age = Period.between(request.birthDate(), LocalDate.now()).getYears();
        if (age < MIN_AGE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Регистрация доступна только с " + MIN_AGE + " лет");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email уже зарегистрирован");
        }

        User user = User.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .phone(request.phone())
                .birthDate(request.birthDate())
                .passwordHash(passwordEncoder.encode(request.password()))
                .emailVerified(false)
                .verificationStatus("unverified")
                .partner(false)
                .build();
        userRepository.save(user);

        String code = verificationCodeService.generateAndStore(request.email());
        emailService.sendVerificationCode(request.email(), code);
    }

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        if (!verificationCodeService.verify(request.email(), request.code())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Неверный или истёкший код");
        }
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
        user.setEmailVerified(true);
        userRepository.save(user);

        return AuthResponse.bearer(jwtService.generateToken(user.getId(), user.getEmail()));
    }

    public void resendCode(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
        if (user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email уже подтверждён");
        }
        String code = verificationCodeService.generateAndStore(email);
        emailService.sendVerificationCode(email, code);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Неверный email или пароль"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Неверный email или пароль");
        }
        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Подтвердите email перед входом");
        }

        return AuthResponse.bearer(jwtService.generateToken(user.getId(), user.getEmail()));
    }

    @Transactional
    public void submitLicense(UUID userId, LicenseRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));

        user.setLicenseNumber(request.licenseNumber());
        user.setLicenseIssueDate(request.licenseIssueDate());
        user.setVerificationStatus("pending");
        userRepository.save(user);
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.email()).ifPresent(user -> {
            String token = passwordResetService.generateToken(user.getEmail());
            String resetLink = frontendBaseUrl + "/reset-password?token=" + token;
            emailService.sendPasswordResetLink(user.getEmail(), resetLink);
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
}