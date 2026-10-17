package com.hutka.backend.ratings;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** Статистика оценок сразу по многим машинам (каталог): один запрос вместо запроса на каждую. Отдельный интерфейс — RatingRepository не меняется. */
public interface RatingCarStatsRepository extends Repository<Rating, UUID> {

    @Query("select r.toCarId as carId, coalesce(sum(r.score), 0L) as totalScore, count(r) as ratingsCount "
            + "from Rating r where r.toCarId in :ids group by r.toCarId")
    List<CarRatingStats> statsForCars(@Param("ids") Collection<UUID> ids);
}
