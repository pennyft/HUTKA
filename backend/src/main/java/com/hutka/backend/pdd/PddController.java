package com.hutka.backend.pdd;

import com.hutka.backend.pdd.dto.PddQuestionResponse;
import com.hutka.backend.pdd.dto.PddResultResponse;
import com.hutka.backend.pdd.dto.PddSubmitRequest;
import com.hutka.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pdd")
@RequiredArgsConstructor
public class PddController {

    private final PddService pddService;

    @GetMapping("/questions")
    public ResponseEntity<List<PddQuestionResponse>> getQuestions(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(pddService.getRandomQuestions(user));
    }

    @PostMapping("/submit")
    public ResponseEntity<PddResultResponse> submitAnswers(
            @RequestBody PddSubmitRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(pddService.submitAnswers(request, user));
    }
}
