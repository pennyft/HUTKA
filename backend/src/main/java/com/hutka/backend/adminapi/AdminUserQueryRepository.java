package com.hutka.backend.adminapi;

import com.hutka.backend.auth.User;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.Repository;

import java.util.Optional;
import java.util.UUID;

/** Поиск пользователей по спецификациям для списка в админке (16.2). Блокирующее чтение — в AdminUserRepository. */
public interface AdminUserQueryRepository extends Repository<User, UUID>, JpaSpecificationExecutor<User> {

    Optional<User> findById(UUID id);
}
