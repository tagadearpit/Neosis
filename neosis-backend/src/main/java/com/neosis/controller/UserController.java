package com.neosis.controller;

import com.neosis.config.TermsAcceptedFilter;
import com.neosis.dto.DeleteAccountRequest;
import com.neosis.dto.UpdateProfileRequest;
import com.neosis.dto.UpdateUserPreferencesRequest;
import com.neosis.dto.UpdateUserSettingsRequest;
import com.neosis.model.User;
import com.neosis.model.UserSettings;
import com.neosis.repository.AbuseReportRepository;
import com.neosis.repository.BlockedUserRepository;
import com.neosis.repository.ChatMessageRepository;
import com.neosis.repository.ChatRequestRepository;
import com.neosis.repository.ConversationPreferenceRepository;
import com.neosis.repository.UserRepository;
import com.neosis.repository.UserSettingsRepository;
import com.neosis.repository.LoginEventRepository;
import com.neosis.service.UserSettingsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatRequestRepository requestRepository;
    private final ConversationPreferenceRepository preferenceRepository;
    private final GridFsTemplate gridFsTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserSettingsService settingsService;
    private final UserSettingsRepository settingsRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final LoginEventRepository loginEventRepository;
    private final AbuseReportRepository reportRepository;
    private final FindByIndexNameSessionRepository<? extends Session> sessionRepository;

    public UserController(
        UserRepository userRepository,
        ChatMessageRepository messageRepository,
        ChatRequestRepository requestRepository,
        ConversationPreferenceRepository preferenceRepository,
        GridFsTemplate gridFsTemplate,
        SimpMessagingTemplate messagingTemplate,
        UserSettingsService settingsService,
        UserSettingsRepository settingsRepository,
        BlockedUserRepository blockedUserRepository,
        LoginEventRepository loginEventRepository,
        AbuseReportRepository reportRepository,
        FindByIndexNameSessionRepository<? extends Session> sessionRepository
    ) {
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
        this.requestRepository = requestRepository;
        this.preferenceRepository = preferenceRepository;
        this.gridFsTemplate = gridFsTemplate;
        this.messagingTemplate = messagingTemplate;
        this.settingsService = settingsService;
        this.settingsRepository = settingsRepository;
        this.blockedUserRepository = blockedUserRepository;
        this.loginEventRepository = loginEventRepository;
        this.reportRepository = reportRepository;
        this.sessionRepository = sessionRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
        @AuthenticationPrincipal OAuth2User principal,
        HttpServletRequest servletRequest
    ) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        Map<String, Object> response = toResponse(user);
        HttpSession session = servletRequest.getSession(false);
        boolean newDeviceLogin = session != null
            && Boolean.TRUE.equals(session.getAttribute(com.neosis.service.LoginAuditService.NEW_DEVICE_ATTRIBUTE));
        response.put("newDeviceLogin", newDeviceLogin);
        if (newDeviceLogin) session.removeAttribute(com.neosis.service.LoginAuditService.NEW_DEVICE_ATTRIBUTE);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/me")
    public ResponseEntity<?> updateProfile(
        @AuthenticationPrincipal OAuth2User principal,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));

        user.setName(request.name());
        user.setNameCustomized(true);
        user.setStatusMessage(request.statusMessage());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        notifyAcceptedContacts(user.getEmail(), "PROFILE_UPDATED");
        return ResponseEntity.ok(toResponse(user));
    }

    @PatchMapping("/me/preferences")
    public ResponseEntity<?> updatePreferences(
        @AuthenticationPrincipal OAuth2User principal,
        @RequestBody UpdateUserPreferencesRequest request
    ) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));

        if (request.notificationSoundsEnabled() != null) {
            user.setNotificationSoundsEnabled(request.notificationSoundsEnabled());
        }
        if (request.typingIndicatorsEnabled() != null) {
            user.setTypingIndicatorsEnabled(request.typingIndicatorsEnabled());
        }
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        UpdateUserSettingsRequest.Privacy privacy = new UpdateUserSettingsRequest.Privacy(
            null, null, null, null, null, request.typingIndicatorsEnabled(), null, null
        );
        String sound = request.notificationSoundsEnabled() == null
            ? null
            : (request.notificationSoundsEnabled() ? "CHIME" : "NONE");
        UpdateUserSettingsRequest.Notifications notifications = new UpdateUserSettingsRequest.Notifications(
            null, null, sound, null, null, null, null, null
        );
        settingsService.update(user.getEmail(), new UpdateUserSettingsRequest(
            privacy, notifications, null, null, null
        ));
        return ResponseEntity.ok(toResponse(user));
    }

    @DeleteMapping("/me")
    public ResponseEntity<?> deleteAccount(
        @AuthenticationPrincipal OAuth2User principal,
        @Valid @RequestBody DeleteAccountRequest request,
        HttpServletRequest servletRequest
    ) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        if (!"DELETE".equals(request.confirmation())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Type DELETE to confirm account deletion"));
        }

        String email = user.getEmail();
        notifyAcceptedContacts(email, "ACCOUNT_DELETED");

        // Idempotent, user-scoped cleanup. Mongo transactions are intentionally not assumed because
        // many managed/free deployments do not expose a replica set to the application.
        requestRepository.deleteBySenderEmailOrReceiverEmail(email, email);
        preferenceRepository.deleteByOwnerEmailOrContactEmail(email, email);
        gridFsTemplate.delete(new Query(new Criteria().orOperator(
            Criteria.where("metadata.senderEmail").is(email),
            Criteria.where("metadata.recipientEmail").is(email)
        )));
        messageRepository.deleteBySenderEmailOrRecipientEmail(email, email);
        settingsRepository.deleteByOwnerEmail(email);
        blockedUserRepository.deleteByBlockerEmailOrBlockedEmail(email, email);
        loginEventRepository.deleteByOwnerEmail(email);
        var retainedReports = reportRepository.findByReportedEmail(email);
        retainedReports.forEach(report -> report.setReportedEmail("deleted:" + user.getId()));
        reportRepository.saveAll(retainedReports);
        reportRepository.deleteByReporterEmail(email);
        for (Session activeSession : sessionRepository.findByPrincipalName(email).values()) {
            sessionRepository.deleteById(activeSession.getId());
        }
        userRepository.delete(user);

        HttpSession session = servletRequest.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/accept-terms")
    public ResponseEntity<?> acceptTerms(
        @AuthenticationPrincipal OAuth2User principal,
        HttpServletRequest servletRequest
    ) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));

        user.setTermsAccepted(true);
        user.setTermsAcceptedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        servletRequest.getSession(true).setAttribute(TermsAcceptedFilter.SESSION_ATTRIBUTE, true);
        return ResponseEntity.ok(Map.of("termsAccepted", true));
    }

    @PostMapping("/presence")
    public ResponseEntity<?> updatePresence(@AuthenticationPrincipal OAuth2User principal) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        LocalDateTime now = LocalDateTime.now();
        if (user.getLastSeenAt() == null || user.getLastSeenAt().isBefore(now.minusSeconds(45))) {
            user.setLastSeenAt(now);
            user.setUpdatedAt(now);
            userRepository.save(user);
        }
        return ResponseEntity.noContent().build();
    }

    private void notifyAcceptedContacts(String email, String type) {
        requestRepository.findAllAcceptedForUser(email).stream()
            .map(request -> request.getSenderEmail().equalsIgnoreCase(email)
                ? request.getReceiverEmail()
                : request.getSenderEmail())
            .distinct()
            .forEach(contact -> messagingTemplate.convertAndSendToUser(
                contact,
                "/queue/notifications",
                Map.of("type", type, "email", email)
            ));
    }

    private User resolveUser(OAuth2User principal) {
        if (principal == null) return null;
        String email = normalizeEmail(principal.getAttribute("email"));
        if (email == null) return null;

        User user = userRepository.findByEmail(email);
        if (user == null) {
            user = new User();
            user.setEmail(email);
            user.setName(principal.getAttribute("name"));
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            user = userRepository.save(user);
        }
        return user;
    }

    private Map<String, Object> toResponse(User user) {
        UserSettings settings = settingsService.getOrCreate(user.getEmail());
        Map<String, Object> userData = new HashMap<>();
        userData.put("email", user.getEmail());
        userData.put("name", user.getName());
        userData.put("statusMessage", user.getStatusMessage());
        userData.put("notificationSoundsEnabled", !"NONE".equals(settings.getNotifications().sound()));
        userData.put("typingIndicatorsEnabled", settings.getPrivacy().typingIndicators());
        userData.put("settings", settingsService.toResponse(settings));
        userData.put("authenticationProvider", "GOOGLE");
        userData.put("emailVerified", true);
        userData.put("passwordManagedByProvider", true);
        userData.put("twoFactorManagedByProvider", true);
        userData.put("passkeysManagedByProvider", true);
        userData.put("termsAccepted", user.isTermsAccepted());
        userData.put("termsAcceptedAt", user.getTermsAcceptedAt());
        userData.put("createdAt", user.getCreatedAt());
        userData.put("lastLoginAt", user.getLastLoginAt());
        userData.put("lastSeenAt", user.getLastSeenAt());
        return userData;
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
