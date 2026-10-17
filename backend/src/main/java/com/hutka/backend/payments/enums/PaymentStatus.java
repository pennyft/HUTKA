package com.hutka.backend.payments.enums;

/** pending — списание начато, ответа шлюза ещё нет; succeeded — деньги списаны; failed — шлюз отказал или недоступен (будут повторы). */
public enum PaymentStatus {
    pending, succeeded, failed
}
