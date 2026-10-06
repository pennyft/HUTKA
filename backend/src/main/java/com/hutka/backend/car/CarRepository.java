package com.hutka.backend.car;

import com.hutka.backend.car.enums.ModerationStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Фото (@ElementCollection) подгружаются сразу через @EntityGraph: контроллеры собирают DTO
 * уже после выхода из сервиса, а spring.jpa.open-in-view выключен, поэтому ленивая загрузка там недоступна.
 */
public interface CarRepository extends JpaRepository<Car, UUID> {

    @Override
    @EntityGraph(attributePaths = "photos")
    Optional<Car> findById(UUID id);

    @EntityGraph(attributePaths = "photos")
    List<Car> findByModerationStatusAndHiddenFalse(ModerationStatus moderationStatus);

    @EntityGraph(attributePaths = "photos")
    List<Car> findByModerationStatusAndHiddenFalseAndLatitudeIsNotNullAndLongitudeIsNotNull(
            ModerationStatus moderationStatus);

    @EntityGraph(attributePaths = "photos")
    List<Car> findByPartnerId(UUID partnerId);
}
