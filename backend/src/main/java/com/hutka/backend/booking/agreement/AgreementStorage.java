package com.hutka.backend.booking.agreement;

import java.util.UUID;

/**
 * Хранилище PDF-договоров. Сейчас — локальный диск (LocalFileAgreementStorage). Раздел 17.3a предусматривает
 * Supabase Storage: когда он будет подключён, достаточно написать вторую реализацию этого интерфейса.
 * В booking.agreement_pdf_url хранится ключ, который вернул save().
 */
public interface AgreementStorage {

    /** Сохраняет PDF (перезаписывает, если уже был) и возвращает ключ для agreement_pdf_url. */
    String save(UUID bookingId, byte[] pdf);

    /**
     * @throws AgreementFileNotFoundException если объекта с таким ключом нет — AgreementService в этом случае
     *                                        сформирует договор заново. Любые другие сбои — обычные RuntimeException.
     */
    byte[] load(String key);
}
