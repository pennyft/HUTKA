package com.hutka.backend.adminapi;

import com.hutka.backend.car.Car;
import com.hutka.backend.car.enums.ModerationStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.UUID;





public interface AdminCarRepository extends Repository<Car, UUID> {

    List<Car> findByModerationStatus(ModerationStatus status, Pageable pageable);

    long countByModerationStatus(ModerationStatus status);

    List<Car> findByHiddenByStrikesTrue(Pageable pageable);

    long countByHiddenByStrikesTrue();

    List<Car> findByHiddenByAdminTrue(Pageable pageable);

    long countByHiddenByAdminTrue();
}
