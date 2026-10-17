package com.hutka.backend.booking.agreement;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Вёрстка договора (раздел 6.6) в виде XHTML для OpenHTMLtoPDF. Парсер PDF-движка требует well-formed XML,
 * поэтому все пользовательские значения экранируются, а HTML-сущности вроде &nbsp; не используются.
 * Шрифт — DejaVu Sans из ресурсов: встроенные шрифты PDF не содержат кириллицу.
 */
public final class AgreementHtmlBuilder {

    public static final String FONT_FAMILY = "DejaVu Sans";
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
    private static final String CURRENCY = "BYN";

    private AgreementHtmlBuilder() {}

    public static String build(AgreementData d, ZoneId zone) {
        StringBuilder h = new StringBuilder(8_192);
        h.append("<html xmlns=\"http://www.w3.org/1999/xhtml\"><head><meta charset=\"UTF-8\"/>")
                .append("<title>Договор аренды</title><style>")
                .append("@page { size: A4; margin: 18mm; }")
                .append("body { font-family: '").append(FONT_FAMILY).append("', sans-serif; font-size: 10pt; color: #18181B; }")
                .append("h1 { font-size: 16pt; margin: 0 0 4pt 0; }")
                .append("h2 { font-size: 11pt; margin: 16pt 0 6pt 0; border-bottom: 1px solid #E4E4E7; padding-bottom: 3pt; }")
                .append("p.meta { color: #71717A; margin: 0 0 6pt 0; }")
                .append("table { width: 100%; border-collapse: collapse; }")
                .append("th { text-align: left; width: 38%; font-weight: normal; color: #71717A; padding: 3pt 6pt 3pt 0; vertical-align: top; }")
                .append("td { padding: 3pt 0; vertical-align: top; }")
                .append("tr.total td, tr.total th { border-top: 1px solid #18181B; padding-top: 5pt; font-size: 11pt; color: #18181B; }")
                .append("ol { margin: 0; padding-left: 16pt; } li { margin: 0 0 2pt 0; word-wrap: break-word; }")
                .append("p.note { margin-top: 18pt; color: #71717A; font-size: 8pt; }")
                .append("</style></head><body>");

        h.append("<h1>Договор аренды автомобиля</h1>")
                .append("<p class=\"meta\">Бронирование № ").append(esc(d.bookingId())).append("</p>")
                .append("<p class=\"meta\">Сформирован: ").append(time(d.generatedAt(), zone))
                .append(" (часовой пояс ").append(esc(zone.getId())).append(")</p>");

        h.append("<h2>1. Стороны</h2><table>")
                .append(row("Арендатор", d.renterName()))
                .append(row("Контакты арендатора", d.renterEmail() + ", " + d.renterPhone()))
                .append(row("Партнёр (владелец)", d.partnerName()))
                .append(row("Контакты партнёра", d.partnerEmail() + ", " + d.partnerPhone()))
                .append("</table>");

        h.append("<h2>2. Автомобиль</h2><table>")
                .append(row("Марка и модель", d.carMake() + " " + d.carModel()))
                .append(row("Год выпуска", String.valueOf(d.carYear())))
                .append(row("Госномер", d.carPlate()))
                .append("</table>");

        h.append("<h2>3. Период аренды</h2><table>")
                .append(row("Запланированное начало", time(d.plannedStart(), zone)))
                .append(row("Запланированный возврат", time(d.plannedEnd(), zone)))
                .append(row("Фактическое начало", time(d.actualStart(), zone)))
                .append(row("Фактический возврат", time(d.actualEnd(), zone)))
                .append("</table>");

        h.append("<h2>4. Стоимость</h2><table>")
                .append(row("Цена за час", money(d.pricePerHour())))
                .append(row("Аренда в пределах плана", money(d.baseAmount())))
                .append(row("Просрочка возврата (" + hours(d.overdueHours()) + " ч × 1,5)", money(d.overdueAmount())))
                .append(row("Скидка за тест ПДД", d.discountApplied() ? "−" + money(d.discountAmount()) : "не применялась"))
                .append("<tr class=\"total\"><th>Итого</th><td>").append(esc(money(d.finalPrice()))).append("</td></tr>")
                .append("</table>");

        h.append("<h2>Приложение. Фотографии состояния автомобиля</h2>")
                .append("<p class=\"meta\">Перед поездкой:</p>").append(links(d.photosBefore()))
                .append("<p class=\"meta\" style=\"margin-top:8pt;\">После поездки:</p>").append(links(d.photosAfter()));

        h.append("<p class=\"note\">Документ сформирован автоматически платформой HUTKA по итогам завершённой поездки ")
                .append("и фиксирует фактические условия и итоговую стоимость аренды.</p>");

        return h.append("</body></html>").toString();
    }

    // ---------------------------------------------------------------- helpers

    private static String row(String label, String value) {
        return "<tr><th>" + esc(label) + "</th><td>" + esc(value) + "</td></tr>";
    }

    private static String links(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return "<p>—</p>";
        }
        StringBuilder sb = new StringBuilder("<ol>");
        for (String url : urls) {
            sb.append("<li><a href=\"").append(esc(url)).append("\">").append(esc(url)).append("</a></li>");
        }
        return sb.append("</ol>").toString();
    }

    private static String time(Instant instant, ZoneId zone) {
        return instant == null ? "—" : DATE_TIME.format(instant.atZone(zone));
    }

    private static String money(BigDecimal amount) {
        BigDecimal value = amount == null ? BigDecimal.ZERO : amount;
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString() + " " + CURRENCY;
    }

    private static String hours(BigDecimal value) {
        if (value == null || value.signum() == 0) {
            return "0";
        }
        return value.stripTrailingZeros().toPlainString();
    }

    /** Экранирование для XML: значения приходят от пользователей (имена, адреса, ссылки). */
    static String esc(Object value) {
        if (value == null) {
            return "";
        }
        String s = value.toString();
        StringBuilder out = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '&' -> out.append("&amp;");
                case '<' -> out.append("&lt;");
                case '>' -> out.append("&gt;");
                case '"' -> out.append("&quot;");
                case '\'' -> out.append("&#39;");
                default -> {
                    // управляющие символы (кроме \t \n \r) недопустимы в XML 1.0
                    if (c >= 0x20 || c == '\t' || c == '\n' || c == '\r') {
                        out.append(c);
                    }
                }
            }
        }
        return out.toString();
    }
}
