package com.hutka.backend.booking.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Проверка ссылок на фото «до/после» (раздел 6.2). Ссылки приходят от клиента и затем попадают в ответы API
 * и в PDF-договор, который уходит на почту, поэтому принимаются только https-ссылки на разрешённые хосты.
 *
 * Разрешённые хосты — app.booking.photo-allowed-hosts, через запятую: точное имя ("abc.supabase.co")
 * или маска поддоменов ("*.supabase.co"). Если параметр пуст, проверяется только схема https
 * (удобно для разработки; в продакшене параметр нужно задать).
 */
@Slf4j
@Component
public class PhotoUrlPolicy {

    private static final int MAX_LENGTH = 1024;

    private final Set<String> exactHosts;
    private final List<String> wildcardSuffixes;

    public PhotoUrlPolicy(@Value("${app.booking.photo-allowed-hosts:}") String allowedHosts) {
        Set<String> exact = new java.util.HashSet<>();
        List<String> suffixes = new ArrayList<>();
        for (String entry : allowedHosts.split(",")) {
            String host = entry.trim().toLowerCase(Locale.ROOT);
            if (host.isEmpty()) {
                continue;
            }
            if (host.startsWith("*.")) {
                suffixes.add(host.substring(1)); // ".supabase.co"
            } else {
                exact.add(host);
            }
        }
        this.exactHosts = Set.copyOf(exact);
        this.wildcardSuffixes = List.copyOf(suffixes);
        if (exactHosts.isEmpty() && wildcardSuffixes.isEmpty()) {
            log.warn("app.booking.photo-allowed-hosts не задан: ссылки на фото проверяются только на https");
        }
    }

    public void validate(List<String> urls) {
        for (String url : urls) {
            if (!isAllowed(url)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Недопустимая ссылка на фото");
            }
        }
    }

    boolean isAllowed(String raw) {
        if (raw == null || raw.isEmpty() || raw.length() > MAX_LENGTH) {
            return false;
        }
        URI uri;
        try {
            uri = new URI(raw); // пробелы, переводы строк и прочий мусор дают URISyntaxException
        } catch (URISyntaxException e) {
            return false;
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) {
            return false;
        }
        if (exactHosts.isEmpty() && wildcardSuffixes.isEmpty()) {
            return true;
        }
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        return exactHosts.contains(host) || wildcardSuffixes.stream().anyMatch(host::endsWith);
    }
}
