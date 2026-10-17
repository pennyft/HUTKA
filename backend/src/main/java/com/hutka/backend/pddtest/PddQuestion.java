package com.hutka.backend.pddtest;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;


@Entity
@Table(name = "pdd_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PddQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 2000)
    private String text;


    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "variants", nullable = false, columnDefinition = "jsonb")
    private String variantsJson;


    @Column(name = "correct_index", nullable = false)
    private int correctIndex;


    @Column(name = "source_chapter")
    private Integer sourceChapter;

    @Column(length = 30)
    private String category;


    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(length = 200)
    private String source;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public List<String> variants() {
        return PddJson.readStrings(variantsJson);
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
