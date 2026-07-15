package com.neosis.controller;

import com.neosis.dto.DeleteAccountRequest;
import com.neosis.dto.UpdateProfileRequest;
import com.neosis.dto.UpdateUserPreferencesRequest;
import com.neosis.model.User;
import com.neosis.repository.ChatMessageRepository;
import com.neosis.repository.ChatRequestRepository;
import com.neosis.repository.ConversationPreferenceRepository;
import com.neosis.repository.UserRepository;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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

    public UserController(
        UserRepository userRepository,
        ChatMessageRepository messageRepository,
        ChatRequestRepository requestRepository,
        ConversationPreferenceRepository preferenceRepository,
        GridFsTemplate gridFsTemplate,
        SimpMessagingTemplate messagingTemplate
    ) {
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
        this.requestRepository = requestRepository;
        this.preferenceRepository = preferenceRepository;
        this.gridFsTemplate = gridFsTemplate;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        return ResponseEntity.ok(toResponse(user));
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
        gridFsTemplate.delete(new Query(new Criteria().orOperator(
            Criteria.where("metadata.senderEmail").is(email),
            Criteria.where("metadata.recipientEmail").is(email)
        )));
        messageRepository.deleteBySenderEmailOrRecipientEmail(email, email);
        requestRepository.deleteBySenderEmailOrReceiverEmail(email, email);
        preferenceRepository.deleteByOwnerEmailOrContactEmail(email, email);
        userRepository.delete(user);

        HttpSession session = servletRequest.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/accept-terms")
    public ResponseEntity<?> acceptTerms(@AuthenticationPrincipal OAuth2User principal) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));

        user.setTermsAccepted(true);
        user.setTermsAcceptedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("termsAccepted", true));
    }

    @GetMapping("/check")
    public ResponseEntity<?> checkUserExists(@RequestParam String email, @AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));

        String recipientEmail = normalizeEmail(email);
        if (recipientEmail == null) return ResponseEntity.badRequest().body(Map.of("error", "Invalid email"));
        User recipient = userRepository.findByEmailIgnoreCase(recipientEmail);
        if (recipient == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User does not exist"));

        String senderName = principal.getAttribute("name") != null ? principal.getAttribute("name") : "Someone";
        Map<String, String> notification = new HashMap<>();
        notification.put("type", "CONTACT_LOOKUP");
        notification.put("senderName", senderName);
        notification.put("message", senderName + " wants to start a conversation.");

        messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/notifications", notification);
        return ResponseEntity.ok(Map.of("exists", true));
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

        User user = userRepository.findByEmailIgnoreCase(email);
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
        Map<String, Object> userData = new HashMap<>();
        userData.put("email", user.getEmail());
        userData.put("name", user.getName());
        userData.put("statusMessage", user.getStatusMessage());
        userData.put("notificationSoundsEnabled", user.isNotificationSoundsEnabled());
        userData.put("typingIndicatorsEnabled", user.isTypingIndicatorsEnabled());
        userData.put("termsAccepted", user.isTermsAccepted());
        userData.put("termsAcceptedAt", user.getTermsAcceptedAt());
        userData.put("createdAt", user.getCreatedAt());
        return userData;
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
