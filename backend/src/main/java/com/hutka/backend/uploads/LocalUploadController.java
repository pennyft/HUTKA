package com.hutka.backend.uploads;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * PUT /uploads/local?key=...&exp=...&sig=... — приёмник файла в режиме app.uploads.mode=local.
 * Открыт без JWT (см. SecurityConfig), доступ даёт только подпись из /uploads/presign.
 */
@RestController
@RequestMapping("/uploads/local")
@RequiredArgsConstructor
public class LocalUploadController {

    private final LocalUploadStore store;

    /** Сколько байт принимаем «сырыми» до сжатия (клиент мог не сжать фото). */
    @Value("${app.uploads.local.max-input-bytes:15728640}")
    private long maxInputBytes;

    @PutMapping
    public ResponseEntity<Void> put(@RequestParam String key, @RequestParam long exp, @RequestParam String sig,
                                    HttpServletRequest request) throws IOException {
        store.verify(key, exp, sig);
        byte[] body = readLimited(request.getInputStream(), maxInputBytes);
        if (body.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Пустой файл");
        }
        store.saveCompressed(key, body);
        return ResponseEntity.ok().build();
    }

    private static byte[] readLimited(InputStream in, long limit) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        long total = 0;
        int n;
        while ((n = in.read(buf)) != -1) {
            total += n;
            if (total > limit) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Файл больше " + (limit / 1024 / 1024) + " МБ");
            }
            out.write(buf, 0, n);
        }
        return out.toByteArray();
    }
}
