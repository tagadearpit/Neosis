package com.neosis.controller;

import com.mongodb.client.result.UpdateResult;
import com.neosis.model.ChatMessage;
import com.neosis.model.ConversationPreference;
import com.neosis.repository.ChatMessageRepository;
import com.neosis.repository.ChatRequestRepository;
import com.neosis.repository.ConversationPreferenceRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatRequestRepository requestRepository;
    private final ConversationPreferenceRepository preferenceRepository;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageController(
        ChatMessageRepository chatMessageRepository,
        ChatRequestRepository requestRepository,
        ConversationPreferenceRepository preferenceRepository,
        MongoTemplate mongoTemplate,
        SimpMessagingTemplate messagingTemplate
    ) {
        this.chatMessageRepository = chatMessageRepository;
        this.requestRepository = requestRepository;
        this.preferenceRepository = preferenceRepository;
        this.mongoTemplate = mongoTemplate;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/history/{friendEmail}")
    public ResponseEntity<?> getChatHistory(
        @PathVariable String friendEmail,
        @RequestParam(defaultValue = "50") int limit,
        OAuth2AuthenticationToken token
    ) {
        String myEmail = authenticatedEmail(token);
        String friend = normalizeEmail(friendEmail);
        if (myEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        if (friend == null || myEmail.equals(friend) || requestRepository.findAcceptedBetween(myEmail, friend).isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Contact relationship required"));
        }

        int safeLimit = Math.max(1, Math.min(limit, 100));
        Pageable pageable = PageRequest.of(0, safeLimit);
        ConversationPreference preference = preferenceRepository.findByOwnerEmailAndContactEmail(myEmail, friend).orElse(null);

        List<ChatMessage> latest = preference != null && preference.getClearedAt() != null
            ? chatMessageRepository.findLatestChatHistoryAfter(myEmail, friend, preference.getClearedAt(), pageable)
            : chatMessageRepository.findLatestChatHistory(myEmail, friend, pageable);

        List<ChatMessage> ordered = new ArrayList<>(latest);
        Collections.reverse(ordered);
        return ResponseEntity.ok(ordered);
    }

    @PostMapping("/read/{friendEmail}")
    public ResponseEntity<?> markRead(@PathVariable String friendEmail, OAuth2AuthenticationToken token) {
        String myEmail = authenticatedEmail(token);
        String friend = normalizeEmail(friendEmail);
        if (myEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        if (friend == null || requestRepository.findAcceptedBetween(myEmail, friend).isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Contact relationship required"));
        }

        LocalDateTime readAt = LocalDateTime.now();
        Query query = Query.query(Criteria.where("senderEmail").is(friend)
            .and("recipientEmail").is(myEmail)
            .and("readAt").is(null));
        UpdateResult result = mongoTemplate.updateMulti(query, new Update().set("readAt", readAt), "messages");

        if (result.getModifiedCount() > 0) {
            messagingTemplate.convertAndSendToUser(friend, "/queue/receipts", Map.of(
                "readerEmail", myEmail,
                "readAt", readAt.toString()
            ));
        }

        return ResponseEntity.ok(Map.of(
            "updated", result.getModifiedCount(),
            "readAt", readAt
        ));
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
