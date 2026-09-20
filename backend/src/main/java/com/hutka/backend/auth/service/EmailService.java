package com.hutka.backend.auth.service;

public interface EmailService {
    void sendVerificationCode(String toEmail, String code);
    void sendPasswordResetLink(String toEmail, String resetLink);
}