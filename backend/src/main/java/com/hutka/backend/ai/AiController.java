package com.hutka.backend.ai;

import com.hutka.backend.ai.dto.AiRequest;
import com.hutka.backend.ai.dto.AiResponse;
import com.hutka.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/chat")
    public ResponseEntity<AiResponse> chat(
            @RequestBody AiRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(aiService.chat(request, user));
    }
}
