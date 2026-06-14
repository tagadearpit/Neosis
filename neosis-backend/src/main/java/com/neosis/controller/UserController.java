package com.neosis.controller;

import com.neosis.model.User;
import com.neosis.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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
            return ResponseEntity.status(401).body("Not authenticated");
        }
        Map<String, String> userData = new HashMap<>();
        userData.put("email", principal.getAttribute("email"));
        userData.put("name", principal.getAttribute("name"));
        return ResponseEntity.ok(userData);
    }

    // FIX: Added missing endpoint to verify Terms & Conditions
    @PostMapping("/accept-terms")
    public ResponseEntity<?> acceptTerms(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) return ResponseEntity.status(401).body("Not authenticated");
        
        String email = principal.getAttribute("email");
        User user = userRepository.findByEmail(email);
        if (user != null) {
            return ResponseEntity.ok().body("Terms accepted");
        }
        return ResponseEntity.status(404).body("User not found");
    }

    @GetMapping("/check")
    public ResponseEntity<?> checkUserExists(@RequestParam String email, @AuthenticationPrincipal OAuth2User principal) {
        User recipient = userRepository.findByEmail(email);
        
        if (recipient != null) {
            String senderName = principal != null ? principal.getAttribute("name") : "Someone";
            
            Map<String, String> notification = new HashMap<>();
            notification.put("senderName", senderName);
            notification.put("message", senderName + " wants to start a conversation!");
            
            // FIX: Use "/queue/notifications/" so it matches React frontend
            messagingTemplate.convertAndSend("/queue/notifications/" + email, notification);

            return ResponseEntity.ok().body("User found");
        } else {
            return ResponseEntity.status(404).body("Sender does not exist"); 
        }
    }
}