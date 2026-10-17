package com.hutka.backend.booking.agreement;

import com.hutka.backend.auth.service.EmailDeliveryException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/** Письмо арендатору с PDF-договором во вложении (раздел 6.6). Тот же JavaMailSender, что и в GmailEmailService. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AgreementMailSender {

    private final JavaMailSender mailSender;

    public void send(String toEmail, String recipientName, byte[] pdf, String fileName) {
        String html = """
                <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#18181B;">
                  <p style="font-size:15px;line-height:1.6;">Здравствуйте, %s!</p>
                  <p style="font-size:15px;line-height:1.6;">
                    Поездка завершена. Во вложении — договор аренды с итоговой стоимостью и фактическим временем поездки.
                  </p>
                  <p style="font-size:13px;color:#71717A;line-height:1.6;">
                    Договор также доступен в личном кабинете в любое время. Это письмо отправляется один раз.
                  </p>
                </div>
                """.formatted(HtmlUtils.htmlEscape(recipientName));

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("HUTKA — договор аренды по завершённой поездке");
            helper.setText(html, true);
            helper.addAttachment(fileName, new ByteArrayDataSource(pdf, "application/pdf"));
            mailSender.send(message);
            log.info("Договор отправлен на {}", toEmail);
        } catch (MessagingException | MailException e) {
            log.error("Не удалось отправить договор на {}: {}", toEmail, e.getMessage());
            throw new EmailDeliveryException("Не удалось отправить договор", e);
        }
    }
}
