package com.neosis.controller;

import com.neosis.model.ChatRequest;
import com.neosis.repository.ChatRequestRepository;
import com.neosis.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    @Autowired
    private ChatRequestRepository requestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(@RequestParam String receiverEmail, OAuth2AuthenticationToken token) {
        String senderEmail = authenticatedEmail(token);
        String receiver = normalizeEmail(receiverEmail);
        if (senderEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        if (receiver == null) return ResponseEntity.badRequest().body("Invalid receiver email.");
        if (senderEmail.equals(receiver)) return ResponseEntity.badRequest().body("You cannot add yourself.");
        if (!userRepository.existsByEmailIgnoreCase(receiver)) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Error: User does not exist in the Neosis network.");

        String pairKey = ChatRequest.buildPairKey(senderEmail, receiver);
        if (requestRepository.existsByPairKeyAndStatusIn(pairKey, List.of("PENDING", "ACCEPTED"))) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Request already exists or this user is already in your contacts.");
        }

        ChatRequest req = new ChatRequest(senderEmail, receiver, "PENDING");
        requestRepository.save(req);

        messagingTemplate.convertAndSendToUser(receiver, "/queue/notifications", Map.of("type", "NEW_REQUEST"));
        return ResponseEntity.ok("Request Sent");
    }

    @GetMapping("/pending")
    public List<ChatRequest> getPendingRequests(OAuth2AuthenticationToken token) {
        String myEmail = authenticatedEmail(token);
        if (myEmail == null) return List.of();
        return requestRepository.findByReceiverEmailAndStatus(myEmail, "PENDING");
    }

    @PostMapping("/accept")
    public ResponseEntity<?> acceptRequest(@RequestParam String requestId, OAuth2AuthenticationToken token) {
        String myEmail = authenticatedEmail(token);
        if (myEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");

        ChatRequest req = requestRepository.findById(requestId).orElse(null);
        if (req == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Not found");
        if (!myEmail.equalsIgnoreCase(req.getReceiverEmail())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden: You cannot accept a request meant for someone else.");
        }
        if (!"PENDING".equals(req.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Request is no longer pending.");
        }

        req.setStatus("ACCEPTED");
        req.setUpdatedAt(LocalDateTime.now());
        requestRepository.save(req);

        messagingTemplate.convertAndSendToUser(req.getSenderEmail(), "/queue/notifications", Map.of("type", "REQUEST_ACCEPTED"));
        return ResponseEntity.ok("Accepted");
    }

    @GetMapping("/friends")
    public List<String> getFriendsList(OAuth2AuthenticationToken token) {
        String myEmail = authenticatedEmail(token);
        if (myEmail == null) return List.of();

        List<ChatRequest> allAccepted = requestRepository.findAllAcceptedForUser(myEmail);
        List<String> friends = new ArrayList<>();

        for (ChatRequest req : allAccepted) {
            friends.add(req.getSenderEmail().equalsIgnoreCase(myEmail) ? req.getReceiverEmail() : req.getSenderEmail());
        }
        return friends;
    }

    private String authenticatedEmail(OAuth2AuthenticationToken token) {
        if (token == null || token.getPrincipal() == null) return null;
        Object email = token.getPrincipal().getAttributes().get("email");
        return normalizeEmail(email == null ? token.getName() : email.toString());
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
