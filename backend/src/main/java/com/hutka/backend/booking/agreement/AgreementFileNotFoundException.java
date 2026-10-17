package com.hutka.backend.booking.agreement;

/**
 * Файла договора нет в хранилище (например, диск был очищен при передеплое).
 * Отличается от прочих сбоев хранилища: договор можно сформировать заново из данных брони.
 */
public class AgreementFileNotFoundException extends RuntimeException {

    public AgreementFileNotFoundException(String key, Throwable cause) {
        super("Файл договора не найден в хранилище: " + key, cause);
    }
}
