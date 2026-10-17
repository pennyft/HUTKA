package com.hutka.backend.pddtest;

import java.util.List;
import java.util.Map;
import java.util.UUID;


public final class PddScoring {

    private PddScoring() {}


    public static int countErrors(List<UUID> issuedQuestionIds, Map<UUID, Integer> correctIndexById, Map<UUID, Integer> answers) {
        int errors = 0;
        for (UUID id : issuedQuestionIds) {
            Integer correct = correctIndexById.get(id);
            if (correct == null) {
                continue;
            }
            Integer given = answers.get(id);
            if (given == null || !given.equals(correct)) {
                errors++;
            }
        }
        return errors;
    }
}
