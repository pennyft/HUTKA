package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.dto.AdminLicenseRequestResponse;
import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.RejectRequest;
import com.hutka.backend.adminapi.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Раздел 3.2, 16.2: верификация водительских удостоверений. */
@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService userService;

    @GetMapping("/license-requests")
    public AdminPage<AdminLicenseRequestResponse> licenseRequests(@RequestParam(defaultValue = "0") int page,
                                                                  @RequestParam(defaultValue = "20") int size) {
        return userService.licenseRequests(page, size);
    }

    @PostMapping("/{id}/license/approve")
    public AdminLicenseRequestResponse approve(@PathVariable UUID id) {
        return userService.approveLicense(id);
    }

    @PostMapping("/{id}/license/reject")
    public AdminLicenseRequestResponse reject(@PathVariable UUID id, @Valid @RequestBody RejectRequest body) {
        return userService.rejectLicense(id, body.reason());
    }
}
