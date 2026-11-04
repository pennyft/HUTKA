package com.hutka.backend.uploads;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.TreeMap;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Подписанная ссылка на загрузку (PUT) в Cloudflare R2 по S3-совместимому API: AWS Signature V4, подпись в строке запроса.
 * Написана без AWS SDK: на бесплатном Render важна память, а нужен только один вид подписи. Результат сверен с boto3
 * (см. R2PresignerTest). R2 принимает такие ссылки только на домене S3 API (https://ACCOUNT.r2.cloudflarestorage.com),
 * на собственных доменах они не работают; ссылку нужно считать токеном (кто её знает, тот и может загрузить файл до истечения срока).
 * В подпись входят заголовки content-type и host: браузер обязан послать PUT с тем же Content-Type, иначе R2 ответит 403.
 */
final class R2Presigner {
    private static final DateTimeFormatter AMZ_DATE = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);
    private static final String SIGNED_HEADERS = "content-type;host";

    private R2Presigner() {}

    /**
     * @param endpoint  https://ACCOUNT_ID.r2.cloudflarestorage.com
     * @param region    для R2 всегда "auto"
     * @param expiresSeconds срок действия ссылки
     */
    static String presignPut(String endpoint, String bucket, String key, String contentType, String accessKeyId, String secretAccessKey,
                             String region, int expiresSeconds, Instant now) {
        URI ep = URI.create(endpoint);
        String host = ep.getPort() == -1 ? ep.getHost() : ep.getHost() + ":" + ep.getPort();
        String amzDate = AMZ_DATE.format(now);
        String day = DAY.format(now);
        String scope = day + "/" + region + "/s3/aws4_request";

        // параметры подписи, отсортированные по имени (для этих имён порядок до и после кодирования совпадает)
        TreeMap<String, String> query = new TreeMap<>();
        query.put("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
        query.put("X-Amz-Credential", accessKeyId + "/" + scope);
        query.put("X-Amz-Date", amzDate);
        query.put("X-Amz-Expires", String.valueOf(expiresSeconds));
        query.put("X-Amz-SignedHeaders", SIGNED_HEADERS);
        String canonicalQuery = query.entrySet().stream().map(e -> encode(e.getKey()) + "=" + encode(e.getValue())).collect(Collectors.joining("&"));

        String canonicalUri = "/" + encode(bucket) + "/" + encodePath(key);
        String canonicalHeaders = "content-type:" + contentType + "\n" + "host:" + host + "\n";
        String canonicalRequest = "PUT\n" + canonicalUri + "\n" + canonicalQuery + "\n" + canonicalHeaders + "\n" + SIGNED_HEADERS + "\nUNSIGNED-PAYLOAD";
        String stringToSign = "AWS4-HMAC-SHA256\n" + amzDate + "\n" + scope + "\n" + hex(sha256(canonicalRequest));

        byte[] k = hmac(("AWS4" + secretAccessKey).getBytes(StandardCharsets.UTF_8), day);
        k = hmac(k, region);
        k = hmac(k, "s3");
        k = hmac(k, "aws4_request");
        String signature = hex(hmac(k, stringToSign));

        return ep.getScheme() + "://" + host + canonicalUri + "?" + canonicalQuery + "&X-Amz-Signature=" + signature;
    }

    /** Кодирование по RFC 3986: без процентов остаются только A-Z a-z 0-9 - _ . ~ ; остальное %XX заглавными. */
    static String encode(String s) {
        StringBuilder sb = new StringBuilder();
        for (byte b : s.getBytes(StandardCharsets.UTF_8)) {
            int c = b & 0xff;
            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~') {
                sb.append((char) c);
            } else {
                sb.append('%').append(Character.toUpperCase(Character.forDigit(c >> 4, 16))).append(Character.toUpperCase(Character.forDigit(c & 15, 16)));
            }
        }
        return sb.toString();
    }

    /** Путь объекта: каждый сегмент кодируется отдельно, косые черты остаются. */
    static String encodePath(String path) {
        return java.util.Arrays.stream(path.split("/", -1)).map(R2Presigner::encode).collect(Collectors.joining("/"));
    }

    private static byte[] sha256(String s) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] hmac(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String hex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
