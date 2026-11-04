package com.hutka.backend.uploads;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/** Ключ объекта в бакете: «cars/2026-10/&lt;uuid&gt;.jpg». Случайное имя исключает перезапись чужих файлов и не раскрывает пользователя. */
final class UploadKeys {
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyy-MM").withZone(ZoneOffset.UTC);

    private UploadKeys() {}

    static String objectKey(UploadFolder folder, Instant now, UUID id) {
        return folder.name() + "/" + MONTH.format(now) + "/" + id + ".jpg";
    }
}
