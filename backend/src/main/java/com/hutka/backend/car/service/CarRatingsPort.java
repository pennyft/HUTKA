package com.hutka.backend.car.service;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/**
 * Точка подключения пакета ratings к каталогу (раздел 7.1). Реализация — ratings.RatingCarRatingsPort.
 * Порт лежит в car, чтобы каталог не зависел от классов ratings.
 */
public interface CarRatingsPort {

    /** Статистика оценок по машинам; машины без единой оценки в результате отсутствуют. */
    Map<UUID, CarRating> ratingsFor(Collection<UUID> carIds);

    /**
     * @param average        среднее, округлённое до 1 знака (раздел 7.1)
     * @param count          число оценок
     * @param sufficient     оценок не меньше минимума из настроек платформы
     * @param belowThreshold рейтинг ниже порога при достаточном числе оценок — машина выпадает из топа выдачи
     */
    record CarRating(BigDecimal average, long count, boolean sufficient, boolean belowThreshold) {}
}
