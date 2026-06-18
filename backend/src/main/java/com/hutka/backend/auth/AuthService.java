package com.hutka.backend.auth;

import com.hutka.backend.auth.dto.AuthResponse;
import com.hutka.backend.auth.dto.LoginRequest;
import com.hutka.backend.auth.dto.RegisterRequest;
import com.hutka.backend.exception.BadRequestException;
import com.hutka.backend.exception.ConflictException;
import com.hutka.backend.exception.ForbiddenException;
import com.hutka.backend.exception.NotFoundException;
import com.hutka.backend.user.User;
import com.hutka.backend.user.UserRepository;
import com.hutka.backend.user.UserRole;
import com.hutka.backend.user.UserStatus;
import com.hutka.backend.verification.EmailVerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already exists");
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new ConflictException("Phone already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dateOfBirth(LocalDate.parse(request.getDateOfBirth()))
                .status(UserStatus.UNVERIFIED)
                .role(UserRole.USER)
                .hasPddDiscount(false)
                .build();

        userRepository.save(user);

        // Отправляем код верификации на email
        emailVerificationService.sendVerificationCode(user);

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(token);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new NotFoundException("Invalid credentials"));

        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new ForbiddenException("Your account has been blocked");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid credentials");
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(token);
    }
}
