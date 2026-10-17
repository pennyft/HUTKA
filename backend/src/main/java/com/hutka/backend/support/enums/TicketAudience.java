package com.hutka.backend.support.enums;

/**
 * Раздел 14: «раздельная система тикетов для арендаторов и партнёров».
 * renter / partner — из какого кабинета написан тикет; system — тикет создала платформа для администратора
 * (например, автоскрытие машины, 6.5), владельца-пользователя у него нет.
 */
public enum TicketAudience { renter, partner, system }
