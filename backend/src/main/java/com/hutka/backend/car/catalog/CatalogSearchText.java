package com.hutka.backend.car.catalog;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/** Раздел 4.1: текстовый поиск по марке и модели. Каждое слово запроса должно встретиться в марке или в модели. */
public final class CatalogSearchText {

    static final int MAX_TOKENS = 5;
    static final int MAX_TOKEN_LENGTH = 50;

    private CatalogSearchText() {}

    /** «Toyota  Camry» → [toyota, camry]; пусто → []. Лишние слова и длинные хвосты отбрасываются. */
    public static List<String> tokens(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return Arrays.stream(query.trim().split("\\s+"))
                .filter(token -> !token.isEmpty())
                .limit(MAX_TOKENS)
                .map(token -> token.length() > MAX_TOKEN_LENGTH ? token.substring(0, MAX_TOKEN_LENGTH) : token)
                .map(token -> token.toLowerCase(Locale.ROOT))
                .toList();
    }

    /** Шаблон для LIKE … ESCAPE '\': символы %, _ и \ в запросе пользователя ищутся как обычные. */
    public static String likeContains(String token) {
        String escaped = token.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
