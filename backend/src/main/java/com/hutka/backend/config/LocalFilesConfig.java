package com.hutka.backend.config;

import com.hutka.backend.uploads.LocalUploadStore;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.TimeUnit;

/** Раздаёт сохранённые фото: GET /files/cars/2026-11/<uuid>.jpg (публично, как публичный URL бакета). */
@Configuration
@RequiredArgsConstructor
public class LocalFilesConfig implements WebMvcConfigurer {

    private final LocalUploadStore store;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/files/**")
                .addResourceLocations(store.baseDir().toUri().toString())
                .setCacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic());
    }
}
