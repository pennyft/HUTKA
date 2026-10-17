package com.hutka.backend.pddtest.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.enums.VerificationStatus;
import com.hutka.backend.booking.BookingRules;
import com.hutka.backend.pddtest.*;
import com.hutka.backend.pddtest.PddCycleCalculator.AttemptSnapshot;
import com.hutka.backend.pddtest.PddCycleCalculator.CycleState;
import com.hutka.backend.pddtest.dto.*;
import com.hutka.backend.pddtest.enums.PddAttemptStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class PddTestService {

    private final PddUserLockRepository userLock;
    private final PddQuestionRepository questions;
    private final PddTestAttemptRepository attempts;
    private final PddDiscountRepository discounts;



    @Transactional
    public PddTestStartResponse start(UUID userId) {
        requireVerified(lockUser(userId));
        Instant now = Instant.now();
        expireStale(userId, now);


        Optional<PddTestAttempt> open = attempts.findByUserIdAndStatus(userId, PddAttemptStatus.in_progress)
                .stream().findFirst();
        if (open.isPresent()) {
            return toStartResponse(open.get());
        }

        CycleState cycle = currentCycle(userId, now);
        if (!cycle.open()) {
            throw conflict("Попытки в этом цикле закончились. Новый цикл откроется " + cycle.nextCycleAt());
        }
        if (questions.countByActiveTrue() < PddRules.QUESTIONS_PER_ATTEMPT) {
            throw conflict("Тест временно недоступен: в базе недостаточно вопросов");
        }

        List<PddQuestion> picked = questions.findRandomActive(PddRules.QUESTIONS_PER_ATTEMPT);
        PddTestAttempt attempt = attempts.save(PddTestAttempt.builder()
                .userId(userId)
                .cycleStartedAt(cycle.cycleStartedAt() != null ? cycle.cycleStartedAt() : now)
                .attemptNumber(cycle.attemptsUsed() + 1)
                .status(PddAttemptStatus.in_progress)
                .questionIdsJson(PddJson.write(picked.stream().map(PddQuestion::getId).toList()))
                .startedAt(now)
                .expiresAt(now.plus(PddRules.TIME_LIMIT))
                .build());
        return toStartResponse(attempt);
    }



    @Transactional
    public PddAttemptResultResponse submit(UUID userId, SubmitAnswersRequest request) {
        lockUser(userId);
        Instant now = Instant.now();

        PddTestAttempt attempt = attempts.findByIdAndUserId(request.attemptId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Попытка не найдена"));
        if (attempt.getStatus() == PddAttemptStatus.expired) {
            throw conflict("Время теста истекло, попытка засчитана как неудачная");
        }
        if (attempt.getStatus() != PddAttemptStatus.in_progress) {
            throw conflict("Ответы по этой попытке уже приняты");
        }
        if (isStale(attempt, now)) {

            throw conflict("Время теста истекло, попытка засчитана как неудачная");
        }

        List<UUID> issued = attempt.questionIds();
        Map<UUID, PddQuestion> byId = questions.findAllById(issued).stream()
                .collect(Collectors.toMap(PddQuestion::getId, Function.identity()));

        Map<UUID, Integer> answers = new HashMap<>();
        for (PddAnswerItem item : request.answers()) {
            if (!issued.contains(item.questionId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Вопрос не входит в эту попытку");
            }
            PddQuestion question = byId.get(item.questionId());
            if (question != null && item.answerIndex() >= question.variants().size()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Недопустимый номер варианта ответа");
            }
            if (answers.put(item.questionId(), item.answerIndex()) != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Повторный ответ на один и тот же вопрос");
            }
        }

        Map<UUID, Integer> correct = byId.values().stream()
                .collect(Collectors.toMap(PddQuestion::getId, PddQuestion::getCorrectIndex));
        int errors = PddScoring.countErrors(issued, correct, answers);
        boolean passed = errors <= PddRules.MAX_ERRORS;

        attempt.setStatus(PddAttemptStatus.completed);
        attempt.setSubmittedAt(now);
        attempt.setErrorsCount(errors);
        attempt.setPassed(passed);

        PddDiscountInfo discountInfo = null;
        if (passed) {

            PddDiscount discount = discounts.save(PddDiscount.builder()
                    .userId(userId)
                    .attemptId(attempt.getId())
                    .grantedAt(now)
                    .expiresAt(now.plus(PddRules.DISCOUNT_VALIDITY))
                    .build());
            discountInfo = toDiscountInfo(discount);
        }

        CycleState cycle = currentCycle(userId, now);
        return new PddAttemptResultResponse(attempt.getId(), attempt.getAttemptNumber(), errors, passed,
                toCycleInfo(cycle), discountInfo);
    }




    @Transactional
    public PddHistoryResponse history(UUID userId) {
        lockUser(userId);
        Instant now = Instant.now();
        expireStale(userId, now);

        List<PddAttemptSummary> list = attempts.findByUserIdOrderByStartedAtDesc(userId).stream()
                .map(a -> new PddAttemptSummary(a.getId(), a.getAttemptNumber(), a.getCycleStartedAt(), a.getStartedAt(),
                        a.getSubmittedAt(), a.getStatus(), a.getErrorsCount(), a.getPassed()))
                .toList();
        PddDiscountInfo active = discounts
                .findFirstByUserIdAndUsedAtIsNullAndExpiresAtAfterOrderByGrantedAtAsc(userId, now)
                .map(PddTestService::toDiscountInfo).orElse(null);
        return new PddHistoryResponse(toCycleInfo(currentCycle(userId, now)), active, list);
    }



    private User lockUser(UUID userId) {
        return userLock.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
    }


    private void requireVerified(User user) {
        if (user.getVerificationStatus() != VerificationStatus.verified) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Тест ПДД доступен после подтверждения водительского удостоверения");
        }
    }


    private static boolean isStale(PddTestAttempt attempt, Instant now) {
        return now.isAfter(attempt.getExpiresAt().plus(PddRules.SUBMIT_GRACE));
    }


    private void expireStale(UUID userId, Instant now) {
        for (PddTestAttempt a : attempts.findByUserIdAndStatus(userId, PddAttemptStatus.in_progress)) {
            if (isStale(a, now)) {
                a.setStatus(PddAttemptStatus.expired);
                a.setSubmittedAt(a.getExpiresAt());
                a.setErrorsCount(a.questionIds().size());
                a.setPassed(false);
            }
        }
    }

    private CycleState currentCycle(UUID userId, Instant now) {
        List<AttemptSnapshot> latestCycle = attempts.findFirstByUserIdOrderByStartedAtDesc(userId)
                .map(last -> attempts.findByUserIdAndCycleStartedAt(userId, last.getCycleStartedAt()).stream()
                        .map(a -> new AttemptSnapshot(a.getCycleStartedAt(), Boolean.TRUE.equals(a.getPassed()), a.getSubmittedAt()))
                        .toList())
                .orElse(List.of());
        return PddCycleCalculator.calculate(latestCycle, now);
    }

    private PddTestStartResponse toStartResponse(PddTestAttempt attempt) {
        List<UUID> ids = attempt.questionIds();
        Map<UUID, PddQuestion> byId = questions.findAllById(ids).stream()
                .collect(Collectors.toMap(PddQuestion::getId, Function.identity()));

        List<PddQuestionResponse> list = ids.stream().map(byId::get).filter(Objects::nonNull)
                .map(q -> new PddQuestionResponse(q.getId(), q.getText(), q.variants()))
                .toList();
        return new PddTestStartResponse(attempt.getId(), attempt.getAttemptNumber(), PddRules.MAX_ATTEMPTS_PER_CYCLE,
                attempt.getStartedAt(), attempt.getExpiresAt(), list);
    }

    private static PddCycleInfo toCycleInfo(CycleState c) {
        return new PddCycleInfo(PddRules.MAX_ATTEMPTS_PER_CYCLE, c.attemptsLeft(), c.nextCycleAt());
    }

    private static PddDiscountInfo toDiscountInfo(PddDiscount d) {
        int percent = BookingRules.PDD_DISCOUNT_RATE.movePointRight(2).intValue();
        return new PddDiscountInfo(d.getGrantedAt(), d.getExpiresAt(), percent);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
