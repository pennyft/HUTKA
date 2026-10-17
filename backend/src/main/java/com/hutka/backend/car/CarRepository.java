package com.hutka.backend.car;

import com.hutka.backend.car.enums.ModerationStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Фото (@ElementCollection) подгружаются сразу через @EntityGraph: контроллеры собирают DTO
 * уже после выхода из сервиса, а spring.jpa.open-in-view выключен, поэтому ленивая загрузка там недоступна.
 */
public interface CarRepository extends JpaRepository<Car, UUID>, JpaSpecificationExecutor<Car> {

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

    /**
     * Каталог (раздел 4.1): условия — Specification, фото сразу в запросе (DTO собирается после выхода из сервиса).
     * Перегрузка findAll(spec) без графа остаётся для карты, которой фото не нужны.
     */
    @Override
    @EntityGraph(attributePaths = "photos")
    List<Car> findAll(Specification<Car> spec, Sort sort);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Car c where c.id = :id")
    Optional<Car> findByIdForUpdate(@Param("id") UUID id);

    @Query("select c.id from Car c where c.partnerId = :partnerId")
    List<UUID> findIdsByPartnerId(@Param("partnerId") UUID partnerId);
}
