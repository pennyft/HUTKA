package com.hutka.backend.adminapi;

/** Что выгружает GET /admin/finance/export (16.5). */
public enum ExportKind {
    /** Успешные списания с комиссией платформы за период (по created_at платежа). */
    commissions,
    /** Выплаты партнёрам за период (по created_at выплаты). */
    payouts
}
