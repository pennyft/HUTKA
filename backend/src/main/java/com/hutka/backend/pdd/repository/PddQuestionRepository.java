package com.hutka.backend.pdd.repository;

import com.hutka.backend.pdd.entity.PddQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PddQuestionRepository extends JpaRepository<PddQuestion, UUID> {

    @Query(value = "SELECT * FROM pdd_questions ORDER BY RANDOM() LIMIT 10", nativeQuery = true)
    List<PddQuestion> findTenRandomQuestions();
}
