package com.hutka.backend.payments;

import com.hutka.backend.payments.enums.PaymentKind;
import com.hutka.backend.payments.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    /** Агрегат по успешным платежам за период — для админских «Финансов» (16.5). */
    interface Totals {
        BigDecimal getAmount();

        BigDecimal getCommission();

        BigDecimal getPartnerAmount();

        long getPaymentsCount();
    }

    Optional<Payment> findByBookingIdAndKind(UUID bookingId, PaymentKind kind);

    /** Какие из переданных броней уже имеют платёж (sweeper ищет завершённые брони без платежа). */
    @Query("select p.bookingId from Payment p where p.bookingId in :ids")
    List<UUID> findBookingIdsIn(@Param("ids") Collection<UUID> ids);

    /** Кандидаты на повтор: неудачные и «зависшие» pending; точное время повтора проверяет PaymentRules.retryDue. */
    List<Payment> findByStatusInAndAttemptsLessThanAndUpdatedAtBefore(Collection<PaymentStatus> statuses, int maxAttempts,
                                                                      Instant before, Pageable pageable);

    // ---------------------------------------------------------------- выплаты

    /** Партнёры, у которых есть успешные платежи, ещё не включённые в выплату. */
    @Query("select distinct p.partnerId from Payment p where p.status = :status and p.payoutId is null and p.createdAt < :before")
    List<UUID> findPartnersWithUnpaid(@Param("status") PaymentStatus status, @Param("before") Instant before);

    List<Payment> findByPartnerIdAndStatusAndPayoutIdIsNullAndCreatedAtBeforeOrderByCreatedAt(UUID partnerId,
                                                                                              PaymentStatus status,
                                                                                              Instant before);

    /**
     * Включает платежи в выплату одним UPDATE; платёж, уже попавший в другую выплату, не затрагивается — по числу
     * обновлённых строк вызывающий замечает гонку и откатывает транзакцию.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Payment p set p.payoutId = :payoutId, p.updatedAt = :now where p.id in :ids and p.payoutId is null")
    int attachToPayout(@Param("ids") Collection<UUID> ids, @Param("payoutId") UUID payoutId, @Param("now") Instant now);

    List<Payment> findByPayoutIdOrderByCreatedAt(UUID payoutId);

    /** Баланс партнёра «до следующей выплаты» (10.6): начислено, но ещё не включено ни в одну выплату. */
    @Query("select coalesce(sum(p.partnerAmount), 0) from Payment p "
            + "where p.partnerId = :partnerId and p.status = :status and p.payoutId is null")
    BigDecimal accruedBalance(@Param("partnerId") UUID partnerId, @Param("status") PaymentStatus status);

    /** То же по всем партнёрам. */
    @Query("select coalesce(sum(p.partnerAmount), 0) from Payment p where p.status = :status and p.payoutId is null")
    BigDecimal accruedBalanceAll(@Param("status") PaymentStatus status);

    // ---------------------------------------------------------------- отчёты (16.5)

    @Query("select coalesce(sum(p.amount), 0) as amount, coalesce(sum(p.commissionAmount), 0) as commission, "
            + "coalesce(sum(p.partnerAmount), 0) as partnerAmount, count(p) as paymentsCount "
            + "from Payment p where p.status = :status and p.createdAt >= :from and p.createdAt < :to")
    Totals totals(@Param("status") PaymentStatus status, @Param("from") Instant from, @Param("to") Instant to);

    Page<Payment> findByStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
            PaymentStatus status, Instant from, Instant to, Pageable pageable);

    long countByStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(PaymentStatus status, Instant from, Instant to);
}
