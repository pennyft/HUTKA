package com.hutka.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    /** Неподтверждённые аккаунты, созданные раньше cutoff (кандидаты на удаление). */
    List<User> findByEmailVerifiedFalseAndCreatedAtBefore(Instant cutoff);

    /**
     * Удаляет пользователя только если email всё ещё не подтверждён: защита от гонки
     * (человек подтвердил email между выборкой и удалением).
     */
    @Transactional
    @Modifying
    @Query("delete from User u where u.id = :id and u.emailVerified = false")
    int deleteIfUnverified(@Param("id") UUID id);
}
