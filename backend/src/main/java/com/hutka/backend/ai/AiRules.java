package com.hutka.backend.ai;

import com.hutka.backend.ai.dto.AiHistoryItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Чистая логика AI-помощника (раздел 11) без Spring и без БД: подготовка входных данных и страховка для опасных ситуаций. */
public final class AiRules {

    public static final int MAX_MESSAGE = 2000;
    /** Сколько последних реплик истории уходит в модель: ограничивает стоимость и длину запроса. */
    public static final int MAX_HISTORY = 10;
    public static final int MAX_PAGE = 100;

    /**
     * Основы слов, при которых без обращения к модели предлагается срочный тикет и подсказка про экстренные службы (11.1:
     * «авария, дым, отказ тормозов и подобное»). Намеренно широкий список: ложное срабатывание стоит лишней подсказки,
     * пропуск — реальной опасности. Основы — в нижнем регистре.
     */
    private static final List<String> DANGER_STEMS = List.of(
            "авари", "дтп", "столкнул", "врезал", "перевернул", "съехал в кювет", "сбил",
            "дым", "пожар", "горит", "загорел", "пахнет гар",
            "отказал тормоз", "отказали тормоз", "тормоза отказ", "тормоза не работ", "не тормозит", "нет тормозов",
            "рулевое не", "руль заклин", "травм", "пострадал", "ранен");

    private AiRules() {}

    /** Обрезает пробелы по краям и ограничивает длину; null → пустая строка. */
    public static String clean(String raw, int max) {
        String text = raw == null ? "" : raw.strip();
        return text.length() <= max ? text : text.substring(0, max);
    }

    /**
     * Страница попадает в системный промпт, поэтому оставляем только символы, из которых состоит путь/адрес страницы:
     * переводы строк и прочие символы, которыми можно «дописать инструкцию», отбрасываются.
     */
    public static String sanitizePage(String raw) {
        if (raw == null) return "неизвестна";
        String cleaned = raw.replaceAll("[^A-Za-z0-9/_\\-.:?=&# ]", "").strip();
        cleaned = cleaned.length() <= MAX_PAGE ? cleaned : cleaned.substring(0, MAX_PAGE);
        return cleaned.isEmpty() ? "неизвестна" : cleaned;
    }

    /** Последние MAX_HISTORY реплик; только user/assistant; пустые отбрасываются; длина реплики ограничена. */
    public static List<AiHistoryItem> trimHistory(List<AiHistoryItem> history) {
        if (history == null) return List.of();
        List<AiHistoryItem> valid = new ArrayList<>();
        for (AiHistoryItem item : history) {
            if (item == null || item.role() == null || item.content() == null) continue;
            String role = item.role().toLowerCase(Locale.ROOT);
            String content = clean(item.content(), MAX_MESSAGE);
            if ((role.equals("user") || role.equals("assistant")) && !content.isEmpty()) {
                valid.add(new AiHistoryItem(role, content));
            }
        }
        return valid.size() <= MAX_HISTORY ? valid : List.copyOf(valid.subList(valid.size() - MAX_HISTORY, valid.size()));
    }

    /** Страховка на случай, если модель не распознала опасную ситуацию (или недоступна). */
    public static boolean looksDangerous(String message) {
        String text = message == null ? "" : message.toLowerCase(Locale.ROOT).replace('ё', 'е');
        return DANGER_STEMS.stream().anyMatch(text::contains);
    }

    /** Тема тикета из текста сообщения (до 200 символов, ограничение Ticket.subject). */
    public static String subjectFrom(String message) {
        String oneLine = clean(message, 200).replaceAll("\\s+", " ");
        return oneLine.length() <= 80 ? oneLine : oneLine.substring(0, 80).strip() + "…";
    }
}
