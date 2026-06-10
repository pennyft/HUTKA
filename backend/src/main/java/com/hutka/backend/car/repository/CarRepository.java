package com.hutka.backend.car.repository;

import com.hutka.backend.car.entity.Car;
import com.hutka.backend.car.enums.CarStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CarRepository extends JpaRepository<Car, UUID> {

    List<Car> findByStatus(CarStatus status);
    List<Car> findByOwnerId(UUID ownerId);
    List<Car> findByOwnerIdAndStatus(UUID ownerId, CarStatus status);
}