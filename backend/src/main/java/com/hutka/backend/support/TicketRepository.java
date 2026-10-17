package com.hutka.backend.support;

import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID>, JpaSpecificationExecutor<Ticket> {

    /** Блокировка строки: сообщение, закрытие и переоткрытие одного тикета выполняются по очереди (проверка статуса не «гоняется»). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Ticket t where t.id = :id")
    Optional<Ticket> findByIdForUpdate(@Param("id") UUID id);

    long countByStatus(TicketStatus status);

    long countByStatusAndPriority(TicketStatus status, TicketPriority priority);

    long countByStatusAndAwaitingAdminSinceIsNotNull(TicketStatus status);

    /** Тикеты пользователей (не системные), созданные с момента since и уже получившие ответ, — для статистики 16.7. */
    @Query("""
            select t.createdAt as createdAt, t.firstAdminReplyAt as firstAdminReplyAt
            from Ticket t
            where t.userId is not null
              and t.firstAdminReplyAt is not null
              and t.createdAt >= :since
            """)
    List<ResponseTimes> findResponseTimesSince(@Param("since") Instant since);

    interface ResponseTimes {
        Instant getCreatedAt();

        Instant getFirstAdminReplyAt();
    }
}
