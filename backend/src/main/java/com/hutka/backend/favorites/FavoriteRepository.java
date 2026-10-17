package com.hutka.backend.favorites;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {

    List<Favorite> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByUserId(UUID userId);

    /** Идемпотентное добавление: повторный POST и гонка двух запросов не дают ошибки уникальности (uq_favorites_user_car). */
    @Modifying
    @Query(value = "insert into favorites (id, user_id, car_id, created_at) "
            + "values (gen_random_uuid(), :userId, :carId, now()) on conflict (user_id, car_id) do nothing",
            nativeQuery = true)
    int addIfAbsent(@Param("userId") UUID userId, @Param("carId") UUID carId);

    @Modifying
    @Query("delete from Favorite f where f.userId = :userId and f.carId = :carId")
    int remove(@Param("userId") UUID userId, @Param("carId") UUID carId);
}
