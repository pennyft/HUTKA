package com.hutka.backend.auth;

import com.hutka.backend.auth.dto.UpdateProfileRequest;
import com.hutka.backend.auth.dto.UserResponse;
import com.hutka.backend.auth.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(userService.getMe(userId));
    }

    /** Раздел 2, 3.1, 23.6: редактирование профиля (имя, фамилия, телефон). */
    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateMe(@AuthenticationPrincipal UUID userId,
                                                 @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateMe(userId, request));
    }
}
