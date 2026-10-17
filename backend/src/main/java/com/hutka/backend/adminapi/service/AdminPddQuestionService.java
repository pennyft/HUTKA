package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.AdminPddQuestionRepository;
import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.CreatePddQuestionRequest;
import com.hutka.backend.adminapi.dto.PddQuestionAdminResponse;
import com.hutka.backend.adminapi.dto.UpdatePddQuestionRequest;
import com.hutka.backend.pddtest.PddJson;
import com.hutka.backend.pddtest.PddQuestion;
import com.hutka.backend.pddtest.PddQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Раздел 16.8: база вопросов теста ПДД — добавление, редактирование, удаление. Неактивные вопросы в тест не попадают
 * (PddQuestionRepository.findRandomActive), поэтому «выключить» вопрос можно через PATCH active=false без удаления.
 * Статистика прохождений (16.8) пока не реализована.
 */
@Service
@RequiredArgsConstructor
public class AdminPddQuestionService {

    private static final int MAX_PAGE_SIZE = 100;
    /** В ТЗ число вариантов не задано; границы выбраны здесь. */
    private static final int MIN_VARIANTS = 2;
    private static final int MAX_VARIANTS = 10;

    private final PddQuestionRepository questions;
    private final AdminPddQuestionRepository adminQuestions;

    @Transactional(readOnly = true)
    public AdminPage<PddQuestionAdminResponse> list(Boolean active, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")));
        Page<PddQuestion> result = active == null ? questions.findAll(pageable) : adminQuestions.findByActive(active, pageable);
        return new AdminPage<>(result.getTotalElements(), result.getContent().stream().map(AdminPddQuestionService::toResponse).toList());
    }

    @Transactional
    public PddQuestionAdminResponse create(CreatePddQuestionRequest request) {
        List<String> variants = normalizeVariants(request.variants());
        requireCorrectIndex(request.correctIndex(), variants.size());
        PddQuestion question = PddQuestion.builder()
                .text(requireText(request.text()))
                .variantsJson(PddJson.write(variants))
                .correctIndex(request.correctIndex())
                .category(blankToNull(request.category()))
                .active(request.active() == null || request.active())
                .source("admin")
                .build();
        return toResponse(questions.save(question));
    }

    @Transactional
    public PddQuestionAdminResponse update(UUID id, UpdatePddQuestionRequest request) {
        PddQuestion question = find(id);
        if (request.text() != null) {
            question.setText(requireText(request.text()));
        }
        List<String> variants = request.variants() != null ? normalizeVariants(request.variants()) : question.variants();
        int correctIndex = request.correctIndex() != null ? request.correctIndex() : question.getCorrectIndex();
        if (request.variants() != null || request.correctIndex() != null) {
            requireCorrectIndex(correctIndex, variants.size());
            question.setVariantsJson(PddJson.write(variants));
            question.setCorrectIndex(correctIndex);
        }
        if (request.category() != null) {
            question.setCategory(blankToNull(request.category()));
        }
        if (request.active() != null) {
            question.setActive(request.active());
        }
        return toResponse(question);
    }

    /**
     * Физическое удаление. Выданные ранее попытки хранят только id вопросов, внешнего ключа нет; как именно
     * PddTestService.submit обработает попытку, в которой выданный вопрос уже удалён, я не проверял, поэтому для вопросов,
     * которые могут быть в активных попытках (15 минут), безопаснее active=false.
     */
    @Transactional
    public void delete(UUID id) {
        questions.delete(find(id));
    }

    private PddQuestion find(UUID id) {
        return questions.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Вопрос не найден"));
    }

    private static String requireText(String text) {
        if (text == null || text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Текст вопроса не может быть пустым");
        }
        return text.trim();
    }

    private static List<String> normalizeVariants(List<String> raw) {
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Укажите варианты ответа");
        }
        List<String> variants = raw.stream().map(v -> v == null ? "" : v.trim()).toList();
        if (variants.size() < MIN_VARIANTS || variants.size() > MAX_VARIANTS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Вариантов ответа должно быть от " + MIN_VARIANTS + " до " + MAX_VARIANTS);
        }
        if (variants.stream().anyMatch(String::isEmpty)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Вариант ответа не может быть пустым");
        }
        if (variants.stream().distinct().count() != variants.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Варианты ответа не должны повторяться");
        }
        return variants;
    }

    private static void requireCorrectIndex(int correctIndex, int variantsCount) {
        if (correctIndex < 0 || correctIndex >= variantsCount) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "correctIndex должен быть от 0 до " + (variantsCount - 1));
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static PddQuestionAdminResponse toResponse(PddQuestion q) {
        return new PddQuestionAdminResponse(q.getId(), q.getText(), q.variants(), q.getCorrectIndex(), q.getCategory(),
                q.isActive(), q.getSource(), q.getCreatedAt());
    }
}
