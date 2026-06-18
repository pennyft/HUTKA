package com.hutka.backend.verification;

import com.hutka.backend.exception.BadRequestException;
import com.hutka.backend.exception.ForbiddenException;
import com.hutka.backend.user.User;
import com.hutka.backend.user.UserRepository;
import com.hutka.backend.user.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final int CODE_EXPIRY_MINUTES = 15;
    private static final int MAX_ATTEMPTS = 3;
    private static final int MAX_RESENDS = 5;

    private final EmailVerificationRepository verificationRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    // ───── ОТПРАВИТЬ КОД ─────

    public void sendVerificationCode(User user) {
        // Проверяем лимит повторных отправок
        int currentResendCount = verificationRepository
                .findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId())
                .map(existing -> {
                    if (existing.getResendCount() >= MAX_RESENDS) {
                        throw new ForbiddenException("Too many resend attempts. Please try again later");
                    }
                    // Помечаем старый код как использованный
                    existing.setUsed(true);
                    verificationRepository.save(existing);
                    return existing.getResendCount();
                })
                .orElse(0);

        String code = generateCode();

        EmailVerification verification = EmailVerification.builder()
                .user(user)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES))
                .resendCount(currentResendCount)
                .build();

        verificationRepository.save(verification);
        sendEmail(user.getEmail(), code);
    }

    // ───── ПОВТОРНАЯ ОТПРАВКА ─────

    public void resendCode(User user) {
        if (user.getStatus() == UserStatus.VERIFIED) {
            throw new BadRequestException("Email is already verified");
        }

        EmailVerification existing = verificationRepository
                .findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new BadRequestException("No active verification found. Please register again"));

        if (existing.getResendCount() >= MAX_RESENDS) {
            throw new ForbiddenException("Too many resend attempts. Please try again later");
        }

        // Помечаем старый код как использованный
        existing.setUsed(true);
        verificationRepository.save(existing);

        String code = generateCode();

        EmailVerification newVerification = EmailVerification.builder()
                .user(user)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES))
                .resendCount(existing.getResendCount() + 1)
                .build();

        verificationRepository.save(newVerification);
        sendEmail(user.getEmail(), code);
    }

    // ───── ПОДТВЕРДИТЬ КОД ─────

    public void verifyCode(User user, String code) {
        if (user.getStatus() == UserStatus.VERIFIED) {
            throw new BadRequestException("Email is already verified");
        }

        EmailVerification verification = verificationRepository
                .findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new BadRequestException("No active verification code found"));

        // Проверяем срок действия
        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            verification.setUsed(true);
            verificationRepository.save(verification);
            throw new BadRequestException("Verification code has expired. Please request a new one");
        }

        // Проверяем количество попыток
        if (verification.getAttempts() >= MAX_ATTEMPTS) {
            verification.setUsed(true);
            verificationRepository.save(verification);
            throw new BadRequestException("Too many failed attempts. Please request a new code");
        }

        // Проверяем код
        if (!verification.getCode().equals(code)) {
            verification.setAttempts(verification.getAttempts() + 1);
            verificationRepository.save(verification);

            int remaining = MAX_ATTEMPTS - verification.getAttempts();
            throw new BadRequestException("Invalid code. " + remaining + " attempts remaining");
        }

        // Код верный — верифицируем пользователя
        verification.setUsed(true);
        verificationRepository.save(verification);

        user.setStatus(UserStatus.VERIFIED);
        userRepository.save(user);
    }

    // ───── ПРИВАТНЫЕ МЕТОДЫ ─────

    private String generateCode() {
        return String.format("%06d", new Random().nextInt(999999));
    }

    private void sendEmail(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("HUTKA — подтверждение email");
        message.setText(
                "Ваш код подтверждения: " + code + "\n\n" +
                        "Код действителен 15 минут.\n" +
                        "Если вы не регистрировались в HUTKA — проигнорируйте это письмо."
        );
        mailSender.send(message);
    }
}