package com.hutka.backend.grouptrips.enums;

/**
 * Раздел 22.3: open | closed | finished. cancelled добавлен: полная отмена организатором (8, 23.5) —
 * отдельное состояние, а не удаление (у участников остаются уведомление и история чата).
 */
public enum GroupTripStatus { open, closed, finished, cancelled }
