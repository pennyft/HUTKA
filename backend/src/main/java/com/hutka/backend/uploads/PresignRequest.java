package com.hutka.backend.uploads;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** POST /uploads/presign. size: размер файла в байтах после сжатия на клиенте (проверяется по app.uploads.max-bytes). */
public record PresignRequest(@NotNull UploadFolder folder, @NotNull @Positive Long size) {}
