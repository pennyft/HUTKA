package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.dto.DashboardResponse;
import com.hutka.backend.adminapi.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Раздел 16.1: дашборд. days — длина периода метрик и графиков (1–365, по умолчанию 30). */
@RestController
@RequestMapping("/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService dashboardService;

    @GetMapping
    public DashboardResponse dashboard(@RequestParam(required = false) Integer days) {
        return dashboardService.dashboard(days);
    }
}
