package com.hutka.backend.pddtest;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;


public final class PddCycleCalculator {

    private PddCycleCalculator() {}


    public record AttemptSnapshot(Instant cycleStartedAt, boolean passed, Instant endedAt) {}


    public record CycleState(boolean open, Instant cycleStartedAt, int attemptsUsed, int attemptsLeft, Instant nextCycleAt) {}


    public static CycleState calculate(List<AttemptSnapshot> latestCycle, Instant now) {
        if (latestCycle.isEmpty()) {
            return newCycle();
        }
        int used = latestCycle.size();
        boolean passed = latestCycle.stream().anyMatch(AttemptSnapshot::passed);
        Instant cycleStart = latestCycle.get(0).cycleStartedAt();


        if (!passed && used < PddRules.MAX_ATTEMPTS_PER_CYCLE) {
            return new CycleState(true, cycleStart, used, PddRules.MAX_ATTEMPTS_PER_CYCLE - used, null);
        }


        if (latestCycle.stream().anyMatch(a -> a.endedAt() == null)) {
            return new CycleState(false, cycleStart, used, 0, null);
        }
        Instant end = latestCycle.stream().map(AttemptSnapshot::endedAt).max(Comparator.naturalOrder()).orElseThrow();
        Instant next = end.atZone(ZoneOffset.UTC).plusMonths(PddRules.CYCLE_LENGTH_MONTHS).toInstant();
        if (!now.isBefore(next)) {
            return newCycle();
        }
        return new CycleState(false, cycleStart, used, 0, next);
    }

    private static CycleState newCycle() {
        return new CycleState(true, null, 0, PddRules.MAX_ATTEMPTS_PER_CYCLE, null);
    }
}
