package com.hutka.backend.adminapi;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.enums.VerificationStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Фильтры списка пользователей (16.2): статус верификации, партнёр, блокировка, текстовый поиск по имени/email/телефону. */
public final class AdminUserSpecifications {

    private AdminUserSpecifications() {}

    public static Specification<User> filter(VerificationStatus status, Boolean partner, Boolean blocked, String q) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("verificationStatus"), status));
            }
            if (partner != null) {
                predicates.add(cb.equal(root.get("partner"), partner));
            }
            if (blocked != null) {
                predicates.add(cb.equal(root.get("blocked"), blocked));
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + escape(q.trim().toLowerCase(Locale.ROOT)) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("email")), like, '\\'),
                        cb.like(cb.lower(root.<String>get("firstName")), like, '\\'),
                        cb.like(cb.lower(root.<String>get("lastName")), like, '\\'),
                        cb.like(root.<String>get("phone"), like, '\\')));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /** Спецсимволы LIKE (%, _, \) в поисковой строке ищутся как обычные символы. */
    static String escape(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
