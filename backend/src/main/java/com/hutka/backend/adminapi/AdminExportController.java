package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.service.AdminExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/** Раздел 16.5: GET /admin/finance/export?kind=commissions|payouts&from=&to= — CSV (UTF-8 с BOM, разделитель «;»). */
@RestController
@RequestMapping("/admin/finance")
@RequiredArgsConstructor
public class AdminExportController {

    private final AdminExportService exportService;

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@RequestParam ExportKind kind,
                                         @RequestParam(required = false) Instant from,
                                         @RequestParam(required = false) Instant to) {
        AdminExportService.ExportFile file = exportService.export(kind, from, to);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.filename()).build().toString())
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .body(file.content());
    }
}
