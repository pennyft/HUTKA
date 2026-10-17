package com.hutka.backend.partner.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/** Раздел 2, 9: кабинет партнёра открывается после одобрения первой машины (is_partner = true). */
@Component
@RequiredArgsConstructor
public class PartnerAccess {

    private final UserRepository users;

    public User requirePartner(UUID userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
        if (!user.isPartner()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Кабинет партнёра доступен после одобрения первой машины");
        }
        return user;
    }
}
