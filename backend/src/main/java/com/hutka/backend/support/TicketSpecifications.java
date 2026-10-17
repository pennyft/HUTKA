package com.hutka.backend.support;

import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;
import jakarta.persistence.criteria.CriteriaQuery;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

/**
 * Динамические фильтры и порядок очереди тикетов. Specification, а не JPQL с «:param is null» — как в BookingSpecifications
 * (PostgreSQL не всегда определяет тип null-параметра).
 */
public final class TicketSpecifications {

    private TicketSpecifications() {}

    public static Specification<Ticket> owner(UUID userId) {
        return (root, query, cb) -> cb.equal(root.get("userId"), userId);
    }

    public static Specification<Ticket> status(TicketStatus status) {
        return status == null ? any() : (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<Ticket> priority(TicketPriority priority) {
        return priority == null ? any() : (root, query, cb) -> cb.equal(root.get("priority"), priority);
    }

    public static Specification<Ticket> category(TicketCategory category) {
        return category == null ? any() : (root, query, cb) -> cb.equal(root.get("category"), category);
    }

    public static Specification<Ticket> audience(TicketAudience audience) {
        return audience == null ? any() : (root, query, cb) -> cb.equal(root.get("audience"), audience);
    }

    /**
     * Очередь администратора (14, 16.7): сначала urgent, затем по времени ожидания — дольше всех ждущие первыми;
     * открытые тикеты, которые ответа не ждут (awaiting_admin_since is null), — в конце уровня.
     * Порядок задаётся здесь, а не через Sort: нужен CASE по приоритету (строки 'normal' &lt; 'urgent' по алфавиту — полагаться на это нельзя).
     */
    public static Specification<Ticket> openQueueOrder() {
        return (root, query, cb) -> {
            if (!isCountQuery(query)) {
                query.orderBy(
                        cb.asc(cb.<Integer>selectCase().when(cb.equal(root.get("priority"), TicketPriority.urgent), 0).otherwise(1)),
                        cb.asc(cb.<Integer>selectCase().when(cb.isNull(root.get("awaitingAdminSince")), 1).otherwise(0)),
                        cb.asc(root.get("awaitingAdminSince")),
                        cb.asc(root.get("createdAt")),
                        cb.asc(root.get("id")));
            }
            return cb.conjunction();
        };
    }

    /** История закрытых тикетов: недавно закрытые первыми. */
    public static Specification<Ticket> closedHistoryOrder() {
        return (root, query, cb) -> {
            if (!isCountQuery(query)) {
                query.orderBy(cb.desc(root.get("closedAt")), cb.asc(root.get("id")));
            }
            return cb.conjunction();
        };
    }

    private static boolean isCountQuery(CriteriaQuery<?> query) {
        return query == null || Long.class.equals(query.getResultType()) || long.class.equals(query.getResultType());
    }

    private static Specification<Ticket> any() {
        return (root, query, cb) -> cb.conjunction();
    }
}
