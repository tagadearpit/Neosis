package com.neosis.controller;

import com.neosis.dto.UpdateUserSettingsRequest;
import com.neosis.model.UserSettings;
import com.neosis.service.UserSettingsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final UserSettingsService settingsService;

    public SettingsController(UserSettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public ResponseEntity<?> getSettings(OAuth2AuthenticationToken token) {
        String email = authenticatedEmail(token);
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        return ResponseEntity.ok(settingsService.toResponse(settingsService.getOrCreate(email)));
    }

    @PatchMapping
    public ResponseEntity<?> updateSettings(
        @RequestBody UpdateUserSettingsRequest request,
        OAuth2AuthenticationToken token
    ) {
        String email = authenticatedEmail(token);
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        UserSettings settings = settingsService.update(email, request);
        return ResponseEntity.ok(settingsService.toResponse(settings));
    }

    private String authenticatedEmail(OAuth2AuthenticationToken token) {
        if (token == null || token.getPrincipal() == null) return null;
        Object email = token.getPrincipal().getAttributes().get("email");
        String value = email == null ? token.getName() : email.toString();
        if (value == null) return null;
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
