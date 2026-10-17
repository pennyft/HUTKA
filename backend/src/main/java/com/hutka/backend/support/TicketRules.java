package com.hutka.backend.support;

import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.OptionalDouble;

/** Чистая логика поддержки (раздел 14, 16.7) без обращения к БД: срок переоткрытия, нормализация текста, статистика ответов. */
public final class TicketRules {

    /** Раздел 14: закрытый тикет можно переоткрыть в течение 7 дней после закрытия. */
    public static final Duration REOPEN_WINDOW = Duration.ofDays(7);
    /** Окно статистики времени ответа (16.7: ТЗ срок не задаёт — решение в SUPPORT_DECISIONS.md). */
    public static final Duration STATS_WINDOW = Duration.ofDays(30);

    public static final int SUBJECT_MAX = 200;
    public static final int TEXT_MAX = 4000;

    private TicketRules() {}

    /** Последний момент, когда переоткрытие ещё допустимо. */
    public static Instant reopenDeadline(Instant closedAt) {
        return closedAt.plus(REOPEN_WINDOW);
    }

    /** «В течение 7 дней»: граница включительно. Для незакрытого тикета (closedAt = null) — false. */
    public static boolean canReopen(Instant closedAt, Instant now) {
        return closedAt != null && !now.isAfter(reopenDeadline(closedAt));
    }

    /** Обрезает пробелы по краям; пустой или слишком длинный текст — IllegalArgumentException с текстом для пользователя. */
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

    /** Для системных тикетов: текст собирает платформа, и он не должен ронять бизнес-операцию (6.5) из-за длины. */
    public static String truncate(String text, int maxLength) {
        if (text == null) return "";
        String stripped = text.strip();
        return stripped.length() <= maxLength ? stripped : stripped.substring(0, maxLength);
    }

    /** Время первого ответа в секундах; отрицательное (рассинхрон часов) считается нулём. */
    public static long responseSeconds(Instant createdAt, Instant firstAdminReplyAt) {
        return Math.max(0, Duration.between(createdAt, firstAdminReplyAt).getSeconds());
    }

    public static OptionalDouble average(Collection<Long> seconds) {
        return seconds.stream().mapToLong(Long::longValue).average();
    }

    /** Медиана: при чётном числе значений — среднее двух средних. */
    public static OptionalDouble median(Collection<Long> seconds) {
        long[] sorted = seconds.stream().mapToLong(Long::longValue).sorted().toArray();
        if (sorted.length == 0) return OptionalDouble.empty();
        int mid = sorted.length / 2;
        return OptionalDouble.of(sorted.length % 2 == 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2.0);
    }
}
