package com.hutka.backend.car.repository;

import com.hutka.backend.car.entity.CarPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CarPhotoRepository extends JpaRepository<CarPhoto, UUID> {

    List<CarPhoto> findByCarId(UUID carId);
}