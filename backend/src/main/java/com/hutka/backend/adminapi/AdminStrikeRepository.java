package com.hutka.backend.adminapi;

import com.hutka.backend.booking.strike.PartnerNoShowStrike;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.repository.Repository;

import java.util.UUID;

public interface AdminStrikeRepository extends Repository<PartnerNoShowStrike, UUID> {

    /**
     * Раздел 16.3: «сброс счётчика страйков при возврате». PartnerStrikeService считает страйки как строки за 30 дней,
     * поэтому обнулить Car.noShowStrikes недостаточно — следующий страйк снова насчитал бы 3+ и скрыл машину.
     */
    @Modifying
    @Query("delete from PartnerNoShowStrike s where s.carId = :carId")
    int deleteByCarId(@Param("carId") UUID carId);
}
