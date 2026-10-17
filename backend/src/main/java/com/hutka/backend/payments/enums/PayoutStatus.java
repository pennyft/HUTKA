package com.hutka.backend.payments.enums;

/** 21.4: pending | paid. Неудачная попытка выплаты оставляет выплату в pending — её повторяет PayoutSweeper. */
public enum PayoutStatus {
    pending, paid
}
