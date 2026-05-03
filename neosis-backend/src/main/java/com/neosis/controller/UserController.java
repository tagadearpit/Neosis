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
@CrossOrigin(origins = {"http://localhost:5173", "https://neosis-static-site.onrender.com"}, allowCredentials = "true")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // NEW: The frontend calls this on load to find out who is currently logged in
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

    @GetMapping("/check")
    public ResponseEntity<?> checkUserExists(@RequestParam String email, @AuthenticationPrincipal OAuth2User principal) {
        // Query your actual PostgreSQL database!
        User recipient = userRepository.findByEmail(email);
        
        if (recipient != null) {
            // If the user exists, generate a notification payload
            String senderName = principal != null ? principal.getAttribute("name") : "Someone";
            
            Map<String, String> notification = new HashMap<>();
            notification.put("senderName", senderName);
            notification.put("message", senderName + " wants to start a conversation!");

            // FIRE THE WEBSOCKET EVENT! Send it specifically to the recipient's email topic
            messagingTemplate.convertAndSend("/topic/notifications/" + email, notification);

            return ResponseEntity.ok().body("User found");
        } else {
            return ResponseEntity.status(404).body("Sender does not exist"); 
        }
    }
}
