package com.hutka.backend.auth.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class GmailEmailService implements EmailService {

    private static final String BG_PAGE = "#F5F5F5";
    private static final String BG_CARD = "#FFFFFF";
    private static final String BG_HEADER = "#18181B";
    private static final String TEXT_PRIMARY = "#18181B";
    private static final String TEXT_SECONDARY = "#71717A";
    private static final String BORDER = "#E4E4E7";
    private static final String BTN_BG = "#18181B";

    private final JavaMailSender mailSender;

    @Override
    public void sendVerificationCode(String toEmail, String code) {
        String body = """
                <p style="margin:0 0 16px;color:%s;font-size:15px;line-height:1.6;">
                    Ваш код подтверждения email:
                </p>
                <div style="background:%s;border:1px solid %s;border-radius:8px;padding:16px 24px;text-align:center;margin:0 0 20px;">
                    <span style="font-size:32px;font-weight:600;letter-spacing:8px;color:%s;">%s</span>
                </div>
                <p style="margin:0;color:%s;font-size:13px;line-height:1.6;">
                    Код действителен 15 минут. Если вы не запрашивали регистрацию — просто проигнорируйте это письмо.
                </p>
                """.formatted(TEXT_PRIMARY, BG_PAGE, BORDER, TEXT_PRIMARY, code, TEXT_SECONDARY);

        send(toEmail, "HUTKA — код подтверждения email", body);
    }

    @Override
    public void sendPasswordResetLink(String toEmail, String resetLink) {
        String body = """
                <p style="margin:0 0 20px;color:%s;font-size:15px;line-height:1.6;">
                    Мы получили запрос на восстановление пароля для вашего аккаунта HUTKA.
                </p>
                <div style="text-align:center;margin:0 0 20px;">
                    <a href="%s" style="display:inline-block;background:%s;color:#FFFFFF;font-size:14px;font-weight:500;
                        text-decoration:none;padding:12px 28px;border-radius:8px;">Сбросить пароль</a>
                </div>
                <p style="margin:0;color:%s;font-size:13px;line-height:1.6;">
                    Ссылка действительна 1 час. Если вы не запрашивали восстановление — проигнорируйте это письмо,
                    пароль останется прежним.
                </p>
                """.formatted(TEXT_PRIMARY, resetLink, BTN_BG, TEXT_SECONDARY);

        send(toEmail, "HUTKA — восстановление пароля", body);
    }

    private void send(String toEmail, String subject, String bodyHtml) {
        String html = """
                <div style="background:%s;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
                  <div style="max-width:480px;margin:0 auto;">
                    <div style="background:%s;border-radius:8px 8px 0 0;padding:20px 28px;">
                      <span style="color:#FFFFFF;font-size:18px;font-weight:600;">HUTKA</span>
                    </div>
                    <div style="background:%s;border:1px solid %s;border-top:none;border-radius:0 0 12px 12px;padding:28px;">
                      %s
                    </div>
                    <p style="text-align:center;color:%s;font-size:12px;margin-top:16px;">
                      © HUTKA — аренда автомобилей
                    </p>
                  </div>
                </div>
                """.formatted(BG_PAGE, BG_HEADER, BG_CARD, BORDER, bodyHtml, TEXT_SECONDARY);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Email sent to {}: {}", toEmail, subject);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Не удалось отправить письмо", e);
        }
    }
}