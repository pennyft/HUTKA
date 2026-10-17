package com.hutka.backend.adminapi;

import com.hutka.backend.pddtest.PddQuestion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.Repository;

import java.util.UUID;

/** Список вопросов с фильтром по активности. Остальное (findById, save, delete, findAll) — PddQuestionRepository. */
public interface AdminPddQuestionRepository extends Repository<PddQuestion, UUID> {

    Page<PddQuestion> findByActive(boolean active, Pageable pageable);
}
