package com.hutka.backend.uploads;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * POST /uploads/presign: подписанная ссылка для загрузки одного фото в R2. Доступно любому вошедшему пользователю
 * (общее правило SecurityConfig: anyRequest().authenticated()): фото нужны арендаторам (до и после поездки) и партнёрам (машины).
 */
@RestController
@RequestMapping("/uploads")
@RequiredArgsConstructor
public class UploadController {
    private final UploadService uploadService;

    @PostMapping("/presign")
    public PresignResponse presign(@Valid @RequestBody PresignRequest request) {
        return uploadService.presign(request);
    }
}
