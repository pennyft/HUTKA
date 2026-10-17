package com.hutka.backend.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hutka.backend.ai.dto.AiTicketDraft;
import com.hutka.backend.ai.enums.AiAction;
import com.hutka.backend.ai.service.CarSearchPort;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Set;

/**
 * Разбор JSON-ответа модели. Модель может ошибиться в формате (DeepSeek в документации: «модель не всегда генерирует
 * валидный JSON»), поэтому всё проверяется: неизвестное действие → none, неизвестная категория → other,
 * приоритет — только normal | urgent. Нет текста reply → IllegalArgumentException (вызывающий покажет «AI недоступен»).
 */
public final class AiReplyParser {

    private static final Set<String> CATEGORIES = Set.of("booking", "payment", "technical", "dispute", "other");
    private static final int REPLY_MAX = 3000;

    private AiReplyParser() {}

    public static AiModelReply parse(String content, ObjectMapper mapper) {
        JsonNode root;
        try {
            root = mapper.readTree(stripFence(content));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Ответ модели не является JSON", e);
        }
        if (root == null || !root.isObject()) {
            throw new IllegalArgumentException("Ответ модели не является JSON-объектом");
        }
        String reply = AiRules.clean(root.path("reply").asText(""), REPLY_MAX);
        if (reply.isEmpty()) {
            throw new IllegalArgumentException("В ответе модели нет текста reply");
        }
        AiAction action = parseAction(root.path("action").asText("none"));
        CarSearchPort.CarSearchQuery query = action == AiAction.search_cars ? parseQuery(root.path("carFilter")) : null;
        AiTicketDraft ticket = (action == AiAction.create_ticket || action == AiAction.offer_ticket)
                ? parseTicket(root.path("ticket")) : null;
        return new AiModelReply(reply, action, query, ticket);
    }

    private static AiAction parseAction(String raw) {
        try {
            return AiAction.valueOf(raw.strip().toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return AiAction.none;
        }
    }

    private static CarSearchPort.CarSearchQuery parseQuery(JsonNode node) {
        return new CarSearchPort.CarSearchQuery(
                text(node, "fuelType"), text(node, "transmission"), integer(node, "seats"), text(node, "bodyType"),
                decimal(node, "minPrice"), decimal(node, "maxPrice"), text(node, "q"));
    }

    private static AiTicketDraft parseTicket(JsonNode node) {
        String category = text(node, "category");
        category = category != null && CATEGORIES.contains(category.toLowerCase(Locale.ROOT)) ? category.toLowerCase(Locale.ROOT) : "other";
        String priority = "urgent".equalsIgnoreCase(text(node, "priority")) ? "urgent" : "normal";
        return new AiTicketDraft(category, priority, text(node, "subject"), text(node, "description"));
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull()) return null;
        String s = v.asText("").strip();
        return s.isEmpty() ? null : s;
    }

    private static Integer integer(JsonNode node, String field) {
        String s = text(node, field);
        if (s == null) return null;
        try {
            return new BigDecimal(s).intValueExact();
        } catch (ArithmeticException | NumberFormatException e) {
            return null;
        }
    }

    private static BigDecimal decimal(JsonNode node, String field) {
        String s = text(node, field);
        if (s == null) return null;
        try {
            BigDecimal value = new BigDecimal(s);
            return value.signum() < 0 ? null : value;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Модель иногда оборачивает JSON в ```json ... ``` несмотря на json_object. */
    private static String stripFence(String content) {
        String s = content == null ? "" : content.strip();
        if (s.startsWith("```")) {
            int firstNewline = s.indexOf('\n');
            int lastFence = s.lastIndexOf("```");
            if (firstNewline > 0 && lastFence > firstNewline) {
                return s.substring(firstNewline + 1, lastFence).strip();
            }
        }
        return s;
    }
}
