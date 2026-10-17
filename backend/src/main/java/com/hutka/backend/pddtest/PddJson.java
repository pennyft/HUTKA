package com.hutka.backend.pddtest;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;


public final class PddJson {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private PddJson() {}

    public static List<String> readStrings(String json) {
        return read(json, new TypeReference<>() {});
    }

    public static List<UUID> readUuids(String json) {
        return read(json, new TypeReference<>() {});
    }

    public static String write(List<?> values) {
        try {
            return MAPPER.writeValueAsString(values);
        } catch (Exception e) {
            throw new IllegalStateException("Не удалось сериализовать список", e);
        }
    }

    private static <T> List<T> read(String json, TypeReference<List<T>> type) {
        try {
            return MAPPER.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("Некорректный JSON в БД: " + json, e);
        }
    }
}
