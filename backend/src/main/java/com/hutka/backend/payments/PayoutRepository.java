package com.hutka.backend.payments;

import com.hutka.backend.payments.enums.PayoutStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PayoutRepository extends JpaRepository<Payout, UUID> {

    Page<Payout> findByPartnerIdOrderByCreatedAtDesc(UUID partnerId, Pageable pageable);

    /** Чужую выплату партнёр получить не может: поиск всегда по паре (id, partner_id). */
    Optional<Payout> findByIdAndPartnerId(UUID id, UUID partnerId);

    /** Выплаты на перечисление и повторы: pending, попытки остались, с последней прошла минимальная пауза. */
    List<Payout> findByStatusAndAttemptsLessThanAndUpdatedAtBefore(PayoutStatus status, int maxAttempts, Instant before,
                                                                   Pageable pageable);

    Page<Payout> findByStatusOrderByCreatedAtDesc(PayoutStatus status, Pageable pageable);

    Page<Payout> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Сумма выплат партнёру в статусе — для «ожидает перечисления» (10.6). */
    @Query("select coalesce(sum(p.amount), 0) from Payout p where p.partnerId = :partnerId and p.status = :status")
    BigDecimal sumByPartnerAndStatus(@Param("partnerId") UUID partnerId, @Param("status") PayoutStatus status);

    @Query("select coalesce(sum(p.amount), 0) from Payout p where p.status = :status")
    BigDecimal sumByStatus(@Param("status") PayoutStatus status);
}
