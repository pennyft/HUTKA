package com.hutka.backend.settings;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformSettingsRepository extends JpaRepository<PlatformSettings, Integer> {
}
