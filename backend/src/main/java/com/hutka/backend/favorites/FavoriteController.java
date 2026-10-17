package com.hutka.backend.favorites;

import com.hutka.backend.car.dto.CarResponse;
import com.hutka.backend.favorites.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Раздел 23.7: избранное. Под /favorites/** действует anyRequest().authenticated() клиентской цепочки — SecurityConfig менять не нужно. */
@RestController
@RequestMapping("/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    public List<CarResponse> list(@AuthenticationPrincipal UUID userId) {
        return favoriteService.list(userId);
    }

    @PostMapping("/{carId}")
    public ResponseEntity<Void> add(@AuthenticationPrincipal UUID userId, @PathVariable UUID carId) {
        favoriteService.add(userId, carId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{carId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal UUID userId, @PathVariable UUID carId) {
        favoriteService.remove(userId, carId);
        return ResponseEntity.noContent().build();
    }
}
