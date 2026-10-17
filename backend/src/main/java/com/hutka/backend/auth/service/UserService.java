package com.hutka.backend.auth.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.auth.dto.UpdateProfileRequest;
import com.hutka.backend.auth.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponse getMe(UUID userId) {
        return toResponse(load(userId));
    }

    /**
     * 23.6: PATCH /users/me. Меняются только присланные поля; email и дата рождения не редактируются (email — логин и
     * подтверждён кодом, 3.1; возраст проверяется при регистрации). Телефон, как и при регистрации, не верифицируется.
     */
    @Transactional
    public UserResponse updateMe(UUID userId, UpdateProfileRequest request) {
        if (request.firstName() == null && request.lastName() == null && request.phone() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Укажите хотя бы одно поле для изменения");
        }
        User user = load(userId);
        if (request.firstName() != null) user.setFirstName(requireText(request.firstName(), "Имя"));
        if (request.lastName() != null) user.setLastName(requireText(request.lastName(), "Фамилия"));
        if (request.phone() != null) user.setPhone(requireText(request.phone(), "Телефон"));
        userRepository.save(user);
        return toResponse(user);
    }

    private User load(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
    }

    private static String requireText(String value, String field) {
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " не может быть пустым");
        }
        return trimmed;
    }

    private static UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(), user.getFirstName(), user.getLastName(), user.getEmail(),
                user.isEmailVerified(), user.getPhone(), user.getBirthDate(),
                user.getVerificationStatus(), user.isPartner()
        );
    }
}
