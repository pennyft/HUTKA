package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.CreatePddQuestionRequest;
import com.hutka.backend.adminapi.dto.PddQuestionAdminResponse;
import com.hutka.backend.adminapi.dto.UpdatePddQuestionRequest;
import com.hutka.backend.adminapi.service.AdminPddQuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Раздел 16.8: управление базой вопросов теста ПДД. */
@RestController
@RequestMapping("/admin/pdd/questions")
@RequiredArgsConstructor
public class AdminPddQuestionController {

    private final AdminPddQuestionService questionService;

    @GetMapping
    public AdminPage<PddQuestionAdminResponse> list(@RequestParam(required = false) Boolean active,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "20") int size) {
        return questionService.list(active, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PddQuestionAdminResponse create(@Valid @RequestBody CreatePddQuestionRequest body) {
        return questionService.create(body);
    }

    @PatchMapping("/{id}")
    public PddQuestionAdminResponse update(@PathVariable UUID id, @Valid @RequestBody UpdatePddQuestionRequest body) {
        return questionService.update(id, body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        questionService.delete(id);
    }
}
