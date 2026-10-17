package com.hutka.backend.pddtest;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface PddQuestionRepository extends JpaRepository<PddQuestion, UUID> {

    long countByActiveTrue();


    @Query(value = "SELECT * FROM pdd_questions WHERE active = TRUE ORDER BY random() LIMIT :limit", nativeQuery = true)
    List<PddQuestion> findRandomActive(@Param("limit") int limit);
}
