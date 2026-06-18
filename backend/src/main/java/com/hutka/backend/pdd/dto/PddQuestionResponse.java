package com.hutka.backend.pdd.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class PddQuestionResponse {

    private UUID id;
    private String questionText;
    private String imageUrl;
    private List<PddAnswerResponse> answers;

    @Data
    public static class PddAnswerResponse {
        private UUID id;
        private String answerText;
        // isCorrect не отдаём клиенту — иначе смысла нет
    }
}
