package com.neosis.controller;

import com.neosis.model.ChatRequest;
import com.neosis.model.ConversationPreference;
import com.neosis.model.User;
import com.neosis.repository.AbuseReportRepository;
import com.neosis.repository.BlockedUserRepository;
import com.neosis.repository.ChatMessageRepository;
import com.neosis.repository.ChatRequestRepository;
import com.neosis.repository.ConversationPreferenceRepository;
import com.neosis.repository.LoginEventRepository;
import com.neosis.repository.UserRepository;
import com.neosis.service.UserSettingsService;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/data")
public class DataPrivacyController {

    private final UserRepository userRepository;
    private final UserSettingsService settingsService;
    private final ChatMessageRepository messageRepository;
    private final ChatRequestRepository requestRepository;
    private final ConversationPreferenceRepository preferenceRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final LoginEventRepository loginEventRepository;
    private final AbuseReportRepository reportRepository;

    public DataPrivacyController(
        UserRepository userRepository,
        UserSettingsService settingsService,
        ChatMessageRepository messageRepository,
        ChatRequestRepository requestRepository,
        ConversationPreferenceRepository preferenceRepository,
        BlockedUserRepository blockedUserRepository,
        LoginEventRepository loginEventRepository,
        AbuseReportRepository reportRepository
    ) {
        this.userRepository = userRepository;
        this.settingsService = settingsService;
        this.messageRepository = messageRepository;
        this.requestRepository = requestRepository;
        this.preferenceRepository = preferenceRepository;
        this.blockedUserRepository = blockedUserRepository;
        this.loginEventRepository = loginEventRepository;
        this.reportRepository = reportRepository;
    }

    @GetMapping("/export")
    public ResponseEntity<?> exportData(OAuth2AuthenticationToken token) {
        String email = authenticatedEmail(token);
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        User user = userRepository.findByEmail(email);
        if (user == null) return ResponseEntity.notFound().build();

        Map<String, Object> export = new LinkedHashMap<>();
        export.put("generatedAt", LocalDateTime.now());
        export.put("profile", profile(user));
        export.put("settings", settingsService.toResponse(settingsService.getOrCreate(email)));
        export.put("contactsAndRequests", requestRepository.findAllForUser(email));
        export.put("conversationSettings", preferenceRepository.findByOwnerEmail(email));
        export.put("messages", messageRepository.findAllForUser(email, LocalDateTime.now()));
        export.put("blockedUsers", blockedUserRepository.findByBlockerEmailOrderByCreatedAtDesc(email));
        export.put("reportsSubmitted", reportRepository.findByReporterEmailOrderByCreatedAtDesc(email));
        export.put("loginHistory", loginEventRepository.findByOwnerEmailOrderByCreatedAtDesc(email, PageRequest.of(0, 100)));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setContentDisposition(ContentDisposition.attachment().filename("neosis-data-export.json").build());
        headers.setCacheControl("no-store");
        return new ResponseEntity<>(export, headers, HttpStatus.OK);
    }

    @DeleteMapping("/chats")
    public ResponseEntity<?> clearAllChats(OAuth2AuthenticationToken token) {
        String email = authenticatedEmail(token);
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        LocalDateTime clearedAt = LocalDateTime.now();
        for (ChatRequest relationship : requestRepository.findAllAcceptedForUser(email)) {
            String contact = relationship.getSenderEmail().equals(email)
                ? relationship.getReceiverEmail()
                : relationship.getSenderEmail();
            ConversationPreference preference = preferenceRepository.findByOwnerEmailAndContactEmail(email, contact)
                .orElseGet(() -> new ConversationPreference(email, contact));
            preference.setClearedAt(clearedAt);
            preference.setUpdatedAt(clearedAt);
            preferenceRepository.save(preference);
        }
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> profile(User user) {
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("email", user.getEmail());
        profile.put("name", user.getName());
        profile.put("statusMessage", user.getStatusMessage());
        profile.put("termsAccepted", user.isTermsAccepted());
        profile.put("termsAcceptedAt", user.getTermsAcceptedAt());
        profile.put("createdAt", user.getCreatedAt());
        profile.put("lastLoginAt", user.getLastLoginAt());
        return profile;
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
