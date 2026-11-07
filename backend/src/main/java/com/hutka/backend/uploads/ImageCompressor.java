package com.hutka.backend.uploads;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

/**
 * Сжатие фото на сервере без внешних библиотек (только javax.imageio): любой формат, который умеет читать ImageIO
 * (JPEG, PNG, GIF, BMP), превращается в JPEG, у которого длинная сторона не больше maxSide.
 * Прозрачность (PNG) заливается белым: JPEG её не поддерживает. Огромные картинки отсекаются до декодирования
 * по заявленным в заголовке размерам (защита от «бомб»: 20 000 x 20 000 пикселей занимают гигабайты памяти).
 * Ограничение: ориентация из EXIF не применяется (ImageIO её игнорирует), поэтому фото, снятое на телефон боком,
 * останется повёрнутым так, как лежит в файле. Браузерное сжатие через canvas обычно уже учитывает ориентацию.
 */
final class ImageCompressor {

    private ImageCompressor() {}

    /** @throws IllegalArgumentException файл не картинка, слишком большая картинка или повреждён */
    static byte[] toJpeg(byte[] input, int maxSide, float quality, long maxPixels) throws IOException {
        BufferedImage src = decode(input, maxPixels);
        BufferedImage rgb = flattenToRgb(src);
        BufferedImage scaled = downscale(rgb, maxSide);
        return encodeJpeg(scaled, quality);
    }

    private static BufferedImage decode(byte[] input, long maxPixels) throws IOException {
        try (ImageInputStream iis = ImageIO.createImageInputStream(new ByteArrayInputStream(input))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) {
                throw new IllegalArgumentException("Файл не является изображением");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(iis, true, true);
                long w = reader.getWidth(0);
                long h = reader.getHeight(0);
                if (w <= 0 || h <= 0 || w * h > maxPixels) {
                    throw new IllegalArgumentException("Изображение слишком большое по размерам в пикселях");
                }
                BufferedImage image = reader.read(0);
                if (image == null) {
                    throw new IllegalArgumentException("Не удалось прочитать изображение");
                }
                return image;
            } catch (IOException | RuntimeException e) {
                if (e instanceof IllegalArgumentException) throw e;
                throw new IllegalArgumentException("Изображение повреждено или формат не поддерживается", e);
            } finally {
                reader.dispose();
            }
        }
    }

    /** JPEG-писатель не принимает альфа-канал, поэтому рисуем на белом фоне в RGB. */
    private static BufferedImage flattenToRgb(BufferedImage src) {
        if (src.getType() == BufferedImage.TYPE_INT_RGB) {
            return src;
        }
        BufferedImage out = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, out.getWidth(), out.getHeight());
            g.drawImage(src, 0, 0, null);
        } finally {
            g.dispose();
        }
        return out;
    }

    /** Уменьшение шагами не более чем вдвое: за один большой шаг билинейная интерполяция даёт рваные края. */
    private static BufferedImage downscale(BufferedImage src, int maxSide) {
        int longest = Math.max(src.getWidth(), src.getHeight());
        if (longest <= maxSide) {
            return src;
        }
        double ratio = (double) maxSide / longest;
        int targetW = Math.max(1, (int) Math.round(src.getWidth() * ratio));
        int targetH = Math.max(1, (int) Math.round(src.getHeight() * ratio));
        BufferedImage current = src;
        int w = src.getWidth();
        int h = src.getHeight();
        while (w > targetW || h > targetH) {
            w = Math.max(targetW, w / 2);
            h = Math.max(targetH, h / 2);
            BufferedImage next = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = next.createGraphics();
            try {
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                g.drawImage(current, 0, 0, w, h, null);
            } finally {
                g.dispose();
            }
            current = next;
        }
        return current;
    }

    private static byte[] encodeJpeg(BufferedImage image, float quality) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            throw new IOException("В JVM нет JPEG-писателя");
        }
        ImageWriter writer = writers.next();
        try {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(quality);
            param.setProgressiveMode(ImageWriteParam.MODE_DEFAULT);
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (MemoryCacheImageOutputStream out = new MemoryCacheImageOutputStream(bytes)) {
                writer.setOutput(out);
                writer.write(null, new IIOImage(image, null, null), param);
            }
            return bytes.toByteArray();
        } finally {
            writer.dispose();
        }
    }
}
