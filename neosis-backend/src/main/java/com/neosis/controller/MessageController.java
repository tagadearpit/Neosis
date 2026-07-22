package com.neosis.controller;

import com.mongodb.client.result.UpdateResult;
import com.neosis.model.ChatMessage;
import com.neosis.model.ChatRequest;
import com.neosis.model.ConversationPreference;
import com.neosis.repository.ChatMessageRepository;
import com.neosis.repository.ChatRequestRepository;
import com.neosis.repository.ConversationPreferenceRepository;
import com.neosis.service.BlockService;
import com.neosis.service.UserSettingsService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ContentDisposition;
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
import java.util.LinkedHashMap;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatRequestRepository requestRepository;
    private final ConversationPreferenceRepository preferenceRepository;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final BlockService blockService;
    private final UserSettingsService settingsService;

    public MessageController(
        ChatMessageRepository chatMessageRepository,
        ChatRequestRepository requestRepository,
        ConversationPreferenceRepository preferenceRepository,
        MongoTemplate mongoTemplate,
        SimpMessagingTemplate messagingTemplate,
        BlockService blockService,
        UserSettingsService settingsService
    ) {
        this.chatMessageRepository = chatMessageRepository;
        this.requestRepository = requestRepository;
        this.preferenceRepository = preferenceRepository;
        this.mongoTemplate = mongoTemplate;
        this.messagingTemplate = messagingTemplate;
        this.blockService = blockService;
        this.settingsService = settingsService;
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
        if (friend == null || myEmail.equals(friend) || !areAcceptedContacts(myEmail, friend)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Contact relationship required"));
        }

        int safeLimit = Math.max(1, Math.min(limit, 100));
        Pageable pageable = PageRequest.of(0, safeLimit);
        ConversationPreference preference = preferenceRepository.findByOwnerEmailAndContactEmail(myEmail, friend).orElse(null);

        LocalDateTime now = LocalDateTime.now();
        List<ChatMessage> latest = preference != null && preference.getClearedAt() != null
            ? chatMessageRepository.findLatestChatHistoryAfter(myEmail, friend, preference.getClearedAt(), now, pageable)
            : chatMessageRepository.findLatestChatHistory(myEmail, friend, now, pageable);

        List<ChatMessage> ordered = new ArrayList<>(latest);
        Collections.reverse(ordered);
        boolean shareReceipts = settingsService.readReceiptsEnabled(friend);
        return ResponseEntity.ok(ordered.stream()
            .map(message -> messageResponse(message, myEmail, friend, shareReceipts))
            .toList());
    }

    @PostMapping("/read/{friendEmail}")
    public ResponseEntity<?> markRead(@PathVariable String friendEmail, OAuth2AuthenticationToken token) {
        String myEmail = authenticatedEmail(token);
        String friend = normalizeEmail(friendEmail);
        if (myEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        if (friend == null || !areAcceptedContacts(myEmail, friend)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Contact relationship required"));
        }

        LocalDateTime readAt = LocalDateTime.now();
        Query query = Query.query(new Criteria().andOperator(
            Criteria.where("senderEmail").is(friend),
            Criteria.where("recipientEmail").is(myEmail),
            Criteria.where("readAt").is(null),
            new Criteria().orOperator(
                Criteria.where("expiresAt").is(null),
                Criteria.where("expiresAt").gt(readAt)
            )
        ));
        UpdateResult result = mongoTemplate.updateMulti(query, new Update().set("readAt", readAt), "messages");

        if (result.getModifiedCount() > 0 && settingsService.readReceiptsEnabled(myEmail)) {
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

    @GetMapping("/export/{friendEmail}")
    public ResponseEntity<?> exportChat(@PathVariable String friendEmail, OAuth2AuthenticationToken token) {
        String myEmail = authenticatedEmail(token);
        String friend = normalizeEmail(friendEmail);
        if (myEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        if (friend == null || !areAcceptedContacts(myEmail, friend)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Contact relationship required"));
        }

        List<ChatMessage> messages = chatMessageRepository.findExportableChatHistory(
            myEmail, friend, LocalDateTime.now(), PageRequest.of(0, 10_000)
        );
        StringBuilder export = new StringBuilder("Neosis chat export\nParticipants: ")
            .append(myEmail).append(" and ").append(friend).append("\nGenerated: ")
            .append(LocalDateTime.now()).append("\n\n");
        for (ChatMessage message : messages) {
            String time = message.getCreatedAt() == null ? message.getTimestamp() : message.getCreatedAt().toString();
            export.append('[').append(time).append("] ")
                .append(message.getSenderEmail()).append(": ")
                .append(message.getContent() == null ? "" : message.getContent());
            if (message.getMediaFilename() != null) export.append(" [attachment: ").append(message.getMediaFilename()).append(']');
            if (message.getExpiresAt() != null) export.append(" [disappears: ").append(message.getExpiresAt()).append(']');
            export.append('\n');
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "plain", StandardCharsets.UTF_8));
        headers.setContentDisposition(ContentDisposition.attachment().filename("neosis-chat-export.txt").build());
        headers.set("X-Export-Message-Count", String.valueOf(messages.size()));
        return new ResponseEntity<>(export.toString(), headers, HttpStatus.OK);
    }

    private Map<String, Object> messageResponse(
        ChatMessage message,
        String viewerEmail,
        String otherEmail,
        boolean otherSharesReceipts
    ) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", message.getId());
        result.put("senderEmail", message.getSenderEmail());
        result.put("recipientEmail", message.getRecipientEmail());
        result.put("content", message.getContent());
        result.put("timestamp", message.getTimestamp());
        result.put("messageType", message.getMessageType());
        result.put("mediaData", message.getMediaData());
        result.put("mediaFilename", message.getMediaFilename());
        result.put("mediaContentType", message.getMediaContentType());
        result.put("mediaSize", message.getMediaSize());
        result.put("createdAt", message.getCreatedAt());
        result.put("expiresAt", message.getExpiresAt());
        boolean viewerSentMessage = viewerEmail.equals(message.getSenderEmail()) && otherEmail.equals(message.getRecipientEmail());
        result.put("readAt", viewerSentMessage && !otherSharesReceipts ? null : message.getReadAt());
        return result;
    }

    private String authenticatedEmail(OAuth2AuthenticationToken token) {
        if (token == null || token.getPrincipal() == null) return null;
        Object email = token.getPrincipal().getAttributes().get("email");
        return normalizeEmail(email == null ? token.getName() : email.toString());
    }

    private boolean areAcceptedContacts(String user1, String user2) {
        return user1 != null && user2 != null && !user1.equalsIgnoreCase(user2)
            && !blockService.isEitherBlocked(user1, user2)
            && requestRepository.existsByPairKeyAndStatus(ChatRequest.buildPairKey(user1, user2), "ACCEPTED");
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
