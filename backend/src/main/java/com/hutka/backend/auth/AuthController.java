package com.hutka.backend.auth;

import com.hutka.backend.auth.dto.AuthResponse;
import com.hutka.backend.auth.dto.LoginRequest;
import com.hutka.backend.auth.dto.RegisterRequest;
import com.hutka.backend.user.User;
import com.hutka.backend.verification.EmailVerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    // Подтверждение кода — пользователь уже авторизован через JWT
    @PostMapping("/verify")
    public ResponseEntity<Void> verify(
            @RequestParam String code,
            @AuthenticationPrincipal User user) {
        emailVerificationService.verifyCode(user, code);
        return ResponseEntity.noContent().build();
    }

    // Повторная отправка кода
    @PostMapping("/resend-code")
    public ResponseEntity<Void> resendCode(@AuthenticationPrincipal User user) {
        emailVerificationService.resendCode(user);
        return ResponseEntity.noContent().build();
    }
}
