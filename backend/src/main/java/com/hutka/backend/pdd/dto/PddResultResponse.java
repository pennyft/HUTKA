package com.hutka.backend.pdd.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PddResultResponse {

    private int correctAnswers;
    private int totalQuestions;
    private boolean passed;
    private boolean discountActivated;
}
