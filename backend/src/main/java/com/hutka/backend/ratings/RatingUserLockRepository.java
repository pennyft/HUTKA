package com.hutka.backend.ratings;

import com.hutka.backend.auth.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

/**
 * Блокировка строки получателя оценки на время «вставка оценки + пересчёт rating_avg» (раздел 7.1):
 * без неё две одновременные оценки могли бы записать устаревшее среднее. Отдельный репозиторий,
 * чтобы не менять UserRepository. Для машины используется CarRepository.findByIdForUpdate.
 */
public interface RatingUserLockRepository extends Repository<User, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") UUID id);
}
