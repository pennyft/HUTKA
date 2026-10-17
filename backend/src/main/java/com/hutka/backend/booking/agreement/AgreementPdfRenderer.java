package com.hutka.backend.booking.agreement;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/** XHTML → PDF через OpenHTMLtoPDF (раздел 17.3a). Кириллица требует встроенного шрифта: /fonts/DejaVuSans.ttf. */
@Component
public class AgreementPdfRenderer {

    private static final String FONT_RESOURCE = "/fonts/DejaVuSans.ttf";

    public byte[] render(String xhtml) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.useFont(AgreementPdfRenderer::openFont, AgreementHtmlBuilder.FONT_FAMILY);
            builder.withHtmlContent(xhtml, null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось сформировать PDF-договор", e);
        }
    }

    private static InputStream openFont() {
        InputStream stream = AgreementPdfRenderer.class.getResourceAsStream(FONT_RESOURCE);
        if (stream == null) {
            throw new IllegalStateException("Не найден шрифт " + FONT_RESOURCE + " (src/main/resources/fonts/DejaVuSans.ttf)");
        }
        return stream;
    }
}
