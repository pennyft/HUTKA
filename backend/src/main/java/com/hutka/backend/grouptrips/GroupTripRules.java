package com.hutka.backend.grouptrips;

import com.hutka.backend.grouptrips.enums.GroupTripStatus;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Чистая логика групповых поездок (раздел 8) без обращения к БД. Методы *Denial возвращают текст отказа для
 * пользователя (сервис превращает его в 409) или пустой Optional, если действие допустимо.
 * «Сегодня» передаётся снаружи (часовой пояс приложения, Europe/Minsk), поэтому всё детерминированно тестируется.
 */
public final class GroupTripRules {

    public static final int ROUTE_MAX = 300;
    public static final int MESSAGE_MAX = 1000;
    /** Организатор входит в число участников, поэтому минимум — двое (в ТЗ не задано, см. GROUPTRIPS_DECISIONS.md). */
    public static final int MIN_PARTICIPANTS = 2;
    public static final int MAX_PARTICIPANTS = 50;

    private GroupTripRules() {}

    // ---------------------------------------------------------------- проверка ввода (IllegalArgumentException)

    /** Пустой или слишком длинный текст — IllegalArgumentException с текстом для пользователя. */
    public static String normalize(String raw, int maxLength, String fieldName) {
        String text = raw == null ? "" : raw.strip();
        if (text.isEmpty()) {
            throw new IllegalArgumentException(fieldName + " не может быть пустым");
        }
        if (text.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " не может быть длиннее " + maxLength + " символов");
        }
        return text;
    }

    public static void validateMaxParticipants(Integer max) {
        if (max == null || max < MIN_PARTICIPANTS || max > MAX_PARTICIPANTS) {
            throw new IllegalArgumentException("Количество участников — от " + MIN_PARTICIPANTS + " до " + MAX_PARTICIPANTS
                    + " (включая организатора)");
        }
    }

    /** Поездку можно создать на сегодня или позже. */
    public static void validateDate(LocalDate date, LocalDate today) {
        if (date == null) {
            throw new IllegalArgumentException("Укажите дату поездки");
        }
        if (date.isBefore(today)) {
            throw new IllegalArgumentException("Дата поездки не может быть в прошлом");
        }
    }

    // ---------------------------------------------------------------- допустимость действий

    /** Присоединение (23.5). Порядок проверок задаёт, какой отказ увидит пользователь. */
    public static Optional<String> joinDenial(GroupTripStatus status, LocalDate tripDate, LocalDate today,
                                              boolean alreadyJoined, long participants, int maxParticipants) {
        if (status == GroupTripStatus.cancelled) return Optional.of("Поездка отменена организатором");
        if (status == GroupTripStatus.finished || today.isAfter(tripDate)) return Optional.of("Поездка уже завершена");
        if (status == GroupTripStatus.closed) return Optional.of("Организатор закрыл набор участников");
        if (alreadyJoined) return Optional.of("Вы уже участвуете в этой поездке");
        if (participants >= maxParticipants) return Optional.of("Свободных мест нет");
        return Optional.empty();
    }

    /** Закрытие набора (8): только открытая и ещё не прошедшая поездка. */
    public static Optional<String> closeDenial(GroupTripStatus status, LocalDate tripDate, LocalDate today) {
        if (status == GroupTripStatus.closed) return Optional.of("Набор участников уже закрыт");
        if (status == GroupTripStatus.cancelled) return Optional.of("Поездка отменена");
        if (status == GroupTripStatus.finished || today.isAfter(tripDate)) return Optional.of("Поездка уже завершена");
        return Optional.empty();
    }

    /**
     * Полная отмена (8): «в любой момент до даты поездки» — читается буквально: пока дата не наступила
     * (в день поездки отменить нельзя). Отменить можно открытую или закрытую для набора поездку.
     */
    public static Optional<String> cancelDenial(GroupTripStatus status, LocalDate tripDate, LocalDate today) {
        if (status == GroupTripStatus.cancelled) return Optional.of("Поездка уже отменена");
        if (status == GroupTripStatus.finished) return Optional.of("Поездка уже завершена");
        if (!today.isBefore(tripDate)) return Optional.of("Отменить поездку можно только до даты поездки");
        return Optional.empty();
    }

    /** Писать в чат можно в открытой и закрытой для набора поездке, не позже дня поездки. История читается всегда. */
    public static boolean chatWritable(GroupTripStatus status, LocalDate tripDate, LocalDate today) {
        return (status == GroupTripStatus.open || status == GroupTripStatus.closed) && !today.isAfter(tripDate);
    }

    /** Поездка прошла (день после даты) — sweeper переводит open/closed в finished. */
    public static boolean isPast(LocalDate tripDate, LocalDate today) {
        return today.isAfter(tripDate);
    }

    // ---------------------------------------------------------------- отображение

    /** Участники — незнакомые люди: показываем имя и первую букву фамилии («Иван П.»), без телефона и почты. */
    public static String displayName(String firstName, String lastName) {
        String first = firstName == null ? "" : firstName.strip();
        String last = lastName == null ? "" : lastName.strip();
        if (last.isEmpty()) return first;
        String initial = last.substring(0, last.offsetByCodePoints(0, 1)) + ".";
        return first.isEmpty() ? initial : first + " " + initial;
    }
}
