package com.hutka.backend.pdd;

import com.hutka.backend.exception.BadRequestException;
import com.hutka.backend.pdd.dto.PddQuestionResponse;
import com.hutka.backend.pdd.dto.PddResultResponse;
import com.hutka.backend.pdd.dto.PddSubmitRequest;
import com.hutka.backend.pdd.entity.PddAnswer;
import com.hutka.backend.pdd.entity.PddQuestion;
import com.hutka.backend.pdd.repository.PddQuestionRepository;
import com.hutka.backend.user.User;
import com.hutka.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PddService {

    private static final int TOTAL_QUESTIONS = 10;
    private static final int PASSING_SCORE = 9;

    private final PddQuestionRepository pddQuestionRepository;
    private final UserRepository userRepository;

    // ───── ПОЛУЧИТЬ 10 СЛУЧАЙНЫХ ВОПРОСОВ ─────

    public List<PddQuestionResponse> getRandomQuestions(User user) {
        if (user.isHasPddDiscount()) {
            throw new BadRequestException("You already have an active PDD discount");
        }

        return pddQuestionRepository.findTenRandomQuestions()
                .stream()
                .map(this::toQuestionResponse)
                .toList();
    }

    // ───── ОТПРАВИТЬ ОТВЕТЫ И ПОЛУЧИТЬ РЕЗУЛЬТАТ ─────

    public PddResultResponse submitAnswers(PddSubmitRequest request, User user) {
        if (user.isHasPddDiscount()) {
            throw new BadRequestException("You already have an active PDD discount");
        }

        Map<UUID, UUID> userAnswers = request.getAnswers();

        if (userAnswers.size() != TOTAL_QUESTIONS) {
            throw new BadRequestException("You must answer all 10 questions");
        }

        int correct = 0;

        for (Map.Entry<UUID, UUID> entry : userAnswers.entrySet()) {
            UUID questionId = entry.getKey();
            UUID answerId = entry.getValue();

            PddQuestion question = pddQuestionRepository.findById(questionId)
                    .orElseThrow(() -> new BadRequestException("Invalid question id: " + questionId));

            boolean isCorrect = question.getAnswers().stream()
                    .anyMatch(a -> a.getId().equals(answerId) && a.isCorrect());

            if (isCorrect) correct++;
        }

        boolean passed = correct >= PASSING_SCORE;
        boolean discountActivated = false;

        if (passed) {
            user.setHasPddDiscount(true);
            userRepository.save(user);
            discountActivated = true;
        }

        return new PddResultResponse(correct, TOTAL_QUESTIONS, passed, discountActivated);
    }

    // ───── ПРИВАТНЫЕ МЕТОДЫ ─────

    private PddQuestionResponse toQuestionResponse(PddQuestion question) {
        PddQuestionResponse response = new PddQuestionResponse();
        response.setId(question.getId());
        response.setQuestionText(question.getQuestionText());
        response.setImageUrl(question.getImageUrl());
        response.setAnswers(
                question.getAnswers().stream()
                        .map(a -> {
                            PddQuestionResponse.PddAnswerResponse ar = new PddQuestionResponse.PddAnswerResponse();
                            ar.setId(a.getId());
                            ar.setAnswerText(a.getAnswerText());
                            return ar;
                        })
                        .toList()
        );
        return response;
    }
}
