package com.hutka.backend.adminapi.dto;

import java.util.List;

/** Страница списка в админке: total — всего записей по фильтру, items — текущая страница. */
public record AdminPage<T>(long total, List<T> items) {}
