package com.hutka.backend.booking.agreement;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.UUID;

/**
 * Договоры на локальном диске: app.agreement.storage-dir (по умолчанию ./data/agreements).
 * Внимание: на хостинге с эфемерным диском файлы пропадут при передеплое — там нужна реализация поверх Supabase Storage.
 */
@Component
public class LocalFileAgreementStorage implements AgreementStorage {

    private final Path baseDir;

    public LocalFileAgreementStorage(@Value("${app.agreement.storage-dir:./data/agreements}") String dir) {
        this.baseDir = Path.of(dir).toAbsolutePath().normalize();
    }

    @Override
    public String save(UUID bookingId, byte[] pdf) {
        String key = bookingId + ".pdf";
        try {
            Files.createDirectories(baseDir);
            Files.write(baseDir.resolve(key), pdf);
            return key;
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось сохранить договор " + key, e);
        }
    }

    @Override
    public byte[] load(String key) {
        Path path = baseDir.resolve(key).normalize();
        if (!path.startsWith(baseDir)) {
            throw new IllegalArgumentException("Недопустимый ключ договора");
        }
        try {
            return Files.readAllBytes(path);
        } catch (NoSuchFileException e) {
            throw new AgreementFileNotFoundException(key, e);
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось прочитать договор " + key, e);
        }
    }
}
