package com.hutka.backend.booking.service;

/**
 * Точка подключения пакета support (раздел 14), которого ещё нет.
 * Раздел 6.5: при автоскрытии машины по страйкам администратору создаётся тикет urgent, категория «Другое».
 */
public interface SupportTicketPort {

    void createUrgentTicketForAdmin(String subject, String description);
}
