package com.hutka.backend.settings;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Чтение настроек платформы. Редактирование (16.9) появится вместе с adminapi. */
@Service
@RequiredArgsConstructor
public class PlatformSettingsService {

    private final PlatformSettingsRepository repository;

    @Transactional(readOnly = true)
    public PlatformSettings get() {
        return repository.findById(PlatformSettings.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException(
                        "В platform_settings нет строки с id = 1 (она создаётся миграцией V7)"));
    }
}
