package com.neosis.controller;

import com.neosis.model.User;
import com.neosis.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not authenticated");
        }

        String email = normalizeEmail(principal.getAttribute("email"));
        User user = userRepository.findByEmailIgnoreCase(email);
        if (user == null) {
            user = new User();
            user.setEmail(email);
            user.setName(principal.getAttribute("name"));
            user.setCreatedAt(LocalDateTime.now());
            userRepository.save(user);
        }

        Map<String, Object> userData = new HashMap<>();
        userData.put("email", user.getEmail());
        userData.put("name", user.getName());
        userData.put("termsAccepted", user.isTermsAccepted());
        userData.put("termsAcceptedAt", user.getTermsAcceptedAt());
        return ResponseEntity.ok(userData);
    }

    @PostMapping("/accept-terms")
    public ResponseEntity<?> acceptTerms(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not authenticated");

        String email = normalizeEmail(principal.getAttribute("email"));
        User user = userRepository.findByEmailIgnoreCase(email);
        if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");

        user.setTermsAccepted(true);
        user.setTermsAcceptedAt(LocalDateTime.now());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("termsAccepted", true));
    }

    @GetMapping("/check")
    public ResponseEntity<?> checkUserExists(@RequestParam String email, @AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not authenticated");

        String recipientEmail = normalizeEmail(email);
        User recipient = userRepository.findByEmailIgnoreCase(recipientEmail);
        if (recipient == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User does not exist");

        String senderName = principal.getAttribute("name") != null ? principal.getAttribute("name") : "Someone";
        Map<String, String> notification = new HashMap<>();
        notification.put("type", "CONTACT_LOOKUP");
        notification.put("senderName", senderName);
        notification.put("message", senderName + " wants to start a conversation.");

        messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/notifications", notification);
        return ResponseEntity.ok("User found");
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
