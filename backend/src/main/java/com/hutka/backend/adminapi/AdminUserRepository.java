package com.hutka.backend.adminapi;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.enums.VerificationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Запросы админки к users. Отдельный интерфейс (как RatingUserLockRepository), чтобы не менять UserRepository. */
public interface AdminUserRepository extends Repository<User, UUID> {

    /** Блокировка строки: два администратора не могут одновременно решить одну заявку. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") UUID id);

    List<User> findByVerificationStatusOrderByCreatedAtAsc(VerificationStatus status, Pageable pageable);

    long countByVerificationStatus(VerificationStatus status);

    List<User> findByIdIn(Collection<UUID> ids);
}
