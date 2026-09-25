package com.hutka.backend.car;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CarRepository extends JpaRepository<Car, UUID> {
    List<Car> findByModerationStatusAndHiddenFalse(String moderationStatus);

    List<Car> findByModerationStatusAndHiddenFalseAndLatitudeIsNotNullAndLongitudeIsNotNull(String moderationStatus);

    List<Car> findByPartnerId(UUID partnerId);
}
