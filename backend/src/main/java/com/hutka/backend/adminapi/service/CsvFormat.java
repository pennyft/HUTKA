package com.hutka.backend.adminapi.service;

import java.util.List;

/**
 * CSV для выгрузок 16.5: разделитель «;» (так файл открывается в Excel с русскими региональными настройками), перевод
 * строки CRLF. Ячейки, начинающиеся с = + - @, табуляции или возврата каретки, получают префикс «'», чтобы значение
 * из БД не выполнилось как формула при открытии в Excel.
 */
final class CsvFormat {

    static final char DELIMITER = ';';
    static final String BOM = "\uFEFF";

    private CsvFormat() {}

    static String row(List<?> cells) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) sb.append(DELIMITER);
            sb.append(cell(cells.get(i)));
        }
        return sb.append("\r\n").toString();
    }

    static String cell(Object value) {
        if (value == null) {
            return "";
        }
        String text = value.toString();
        if (!text.isEmpty() && "=+-@\t\r".indexOf(text.charAt(0)) >= 0 && !isNumber(value)) {
            text = "'" + text;
        }
        boolean quote = text.indexOf(DELIMITER) >= 0 || text.indexOf('"') >= 0 || text.indexOf('\n') >= 0
                || text.indexOf('\r') >= 0;
        return quote ? "\"" + text.replace("\"", "\"\"") + "\"" : text;
    }

    /** Отрицательные числа из БД не экранируются: «-5.00» — число, а не формула. */
    private static boolean isNumber(Object value) {
        return value instanceof Number;
    }
}
