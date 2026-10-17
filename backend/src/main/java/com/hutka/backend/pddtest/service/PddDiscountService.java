package com.hutka.backend.pddtest.service;

import com.hutka.backend.booking.service.PddDiscountPort;
import com.hutka.backend.pddtest.PddDiscount;
import com.hutka.backend.pddtest.PddDiscountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;


@Service
@RequiredArgsConstructor
public class PddDiscountService implements PddDiscountPort {

    private final PddDiscountRepository discounts;


    @Override
    @Transactional
    public boolean consumeDiscount(UUID userId, UUID bookingId, Instant bookingCreatedAt) {
        List<PddDiscount> valid = discounts.findValidForUpdate(userId, bookingCreatedAt, PageRequest.of(0, 1));
        if (valid.isEmpty()) {
            return false;
        }
        PddDiscount discount = valid.get(0);
        discount.setUsedAt(Instant.now());
        discount.setBookingId(bookingId);
        return true;
    }
}
