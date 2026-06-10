package com.hutka.backend.car.repository;

import com.hutka.backend.car.entity.CarSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CarScheduleRepository extends JpaRepository<CarSchedule, UUID> {

    List<CarSchedule> findByCarId(UUID carId);
}