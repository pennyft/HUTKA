package com.hutka.backend.adminapi;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Создаёт первого администратора при старте, если админа с таким email ещё нет.
 * Включается только свойством app.admin.bootstrap-enabled=true; после первого запуска выключите его.
 * Пароль берите из переменной окружения и не коммитьте в репозиторий.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.admin.bootstrap-enabled", havingValue = "true")
public class AdminBootstrap implements ApplicationRunner {

    private static final int MIN_PASSWORD_LENGTH = 12;

    private final AdminRepository admins;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.bootstrap-email:admin@hutka.test}")
    private String email;

    @Value("${app.admin.bootstrap-password:}")
    private String password;

    @Override
    public void run(ApplicationArguments args) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            log.warn("Администратор не создан: app.admin.bootstrap-password пуст или короче {} символов", MIN_PASSWORD_LENGTH);
            return;
        }
        if (admins.findByEmail(email).isPresent()) {
            log.info("Администратор {} уже существует, создание пропущено", email);
            return;
        }
        admins.save(Admin.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .displayName("Главный администратор")
                .enabled(true) // без @Builder.Default значение по умолчанию в билдере было бы false
                .build());
        log.info("Создан администратор {}. Отключите app.admin.bootstrap-enabled после первого запуска", email);
    }
}
