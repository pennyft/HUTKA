package com.hutka.backend.pddtest;

import com.hutka.backend.pddtest.dto.PddAttemptResultResponse;
import com.hutka.backend.pddtest.dto.PddHistoryResponse;
import com.hutka.backend.pddtest.dto.PddTestStartResponse;
import com.hutka.backend.pddtest.dto.SubmitAnswersRequest;
import com.hutka.backend.pddtest.service.PddTestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;


@RestController
@RequestMapping("/pddtest")
@RequiredArgsConstructor
public class PddTestController {

    private final PddTestService pddTestService;


    @GetMapping("/questions")
    public PddTestStartResponse questions(@AuthenticationPrincipal UUID userId) {
        return pddTestService.start(userId);
    }


    @PostMapping("/attempts")
    public PddAttemptResultResponse submit(@AuthenticationPrincipal UUID userId,
                                           @Valid @RequestBody SubmitAnswersRequest request) {
        return pddTestService.submit(userId, request);
    }


    @GetMapping("/attempts")
    public PddHistoryResponse history(@AuthenticationPrincipal UUID userId) {
        return pddTestService.history(userId);
    }
}
