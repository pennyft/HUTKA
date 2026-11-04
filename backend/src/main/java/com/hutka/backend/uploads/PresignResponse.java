package com.hutka.backend.uploads;

/**
 * uploadUrl: куда клиент делает PUT с телом файла и заголовком Content-Type: contentType (иначе 403 от R2).
 * publicUrl: ссылка, которую потом отправляют в API (photosBefore, photosAfter, photos машины); её хост должен быть в app.booking.photo-allowed-hosts.
 */
public record PresignResponse(String uploadUrl, String publicUrl, String contentType, int expiresInSeconds) {}
