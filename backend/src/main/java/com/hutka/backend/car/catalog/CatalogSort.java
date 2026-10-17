package com.hutka.backend.car.catalog;

/** Раздел 4.1: сортировка каталога. По умолчанию — rating. */
public enum CatalogSort {
    /** По рейтингу; машины с рейтингом ниже порога (при достаточном числе оценок) идут в конце (7.1). */
    rating,
    price_asc,
    price_desc,
    /** «Ближе ко мне»: нужны координаты пользователя (lat и lng). */
    distance
}
