package com.hutka.backend.pddtest;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;


@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.pddtest.seed-enabled", havingValue = "true")
public class PddQuestionSeeder implements ApplicationRunner {

    private static final String SEED_RESOURCE = "pddtest/questions-seed.json";
    private static final String SOURCE = "github.com/lehaSVV2009/traffic-laws-belarus (2017, MIT)";

    public record SeedQuestion(String text, List<String> variants, int correctIndex, Integer sourceChapter, Integer sourceId) {}

    private final PddQuestionRepository questions;
    private final ObjectMapper objectMapper;

    @Value("${app.pddtest.seed-active:false}")
    private boolean seedActive;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (questions.count() > 0) {
            log.info("Загрузка вопросов ПДД пропущена: в базе уже есть вопросы");
            return;
        }
        List<SeedQuestion> seed;
        try (InputStream in = new ClassPathResource(SEED_RESOURCE).getInputStream()) {
            seed = objectMapper.readValue(in, new TypeReference<>() {});
        }
        List<PddQuestion> entities = seed.stream().map(s -> PddQuestion.builder()
                .text(s.text())
                .variantsJson(PddJson.write(s.variants()))
                .correctIndex(s.correctIndex())
                .sourceChapter(s.sourceChapter())
                .source(SOURCE + ", id " + s.sourceId())
                .active(seedActive)
                .build()).toList();
        questions.saveAll(entities);
        log.warn("Загружено вопросов ПДД: {} (active={}). Вопросы не проверены по действующим ПДД — см. docs/PDDTEST_DECISIONS.md",
                entities.size(), seedActive);
    }
}
