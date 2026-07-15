package com.neosis.controller;

import com.neosis.dto.ConversationSummary;
import com.neosis.dto.UpdateConversationPreferenceRequest;
import com.neosis.model.ChatRequest;
import com.neosis.model.ConversationPreference;
import com.neosis.model.User;
import com.neosis.repository.ChatMessageRepository;
import com.neosis.repository.ChatRequestRepository;
import com.neosis.repository.ConversationPreferenceRepository;
import com.neosis.repository.UserRepository;
import com.mongodb.client.result.UpdateResult;
import jakarta.validation.Valid;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ChatRequestRepository requestRepository;
    private final ConversationPreferenceRepository preferenceRepository;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    public ConversationController(
        ChatRequestRepository requestRepository,
        ConversationPreferenceRepository preferenceRepository,
        ChatMessageRepository messageRepository,
        UserRepository userRepository,
        MongoTemplate mongoTemplate,
        SimpMessagingTemplate messagingTemplate
    ) {
        this.requestRepository = requestRepository;
        this.preferenceRepository = preferenceRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.mongoTemplate = mongoTemplate;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping
    public ResponseEntity<?> listConversations(OAuth2AuthenticationToken token) {
        String ownerEmail = authenticatedEmail(token);
        if (ownerEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));

        List<ChatRequest> relationships = requestRepository.findAllAcceptedForUser(ownerEmail);
        Set<String> contactEmails = relationships.stream()
            .map(req -> req.getSenderEmail().equalsIgnoreCase(ownerEmail) ? req.getReceiverEmail() : req.getSenderEmail())
            .collect(Collectors.toSet());

        Map<String, User> usersByEmail = userRepository.findByEmailIn(contactEmails).stream()
            .collect(Collectors.toMap(User::getEmail, user -> user));
        Map<String, ConversationPreference> preferencesByContact = preferenceRepository.findByOwnerEmail(ownerEmail).stream()
            .collect(Collectors.toMap(ConversationPreference::getContactEmail, pref -> pref, (first, ignored) -> first));

        List<ConversationSummary> summaries = new ArrayList<>();
        for (String contactEmail : contactEmails) {
            User contact = usersByEmail.get(contactEmail);
            ConversationPreference preference = preferencesByContact.get(contactEmail);
            int at = contactEmail.indexOf('@');
            String fallbackName = at > 0 ? contactEmail.substring(0, at) : contactEmail;

            summaries.add(new ConversationSummary(
                contactEmail,
                contact == null || contact.getName() == null || contact.getName().isBlank() ? fallbackName : contact.getName(),
                contact == null ? "Available on Neosis" : contact.getStatusMessage(),
                preference != null && preference.isPinned(),
                preference != null && preference.isMuted(),
                messageRepository.countUnread(contactEmail, ownerEmail)
            ));
        }

        summaries.sort(
            Comparator.comparing(ConversationSummary::pinned).reversed()
                .thenComparing(ConversationSummary::name, String.CASE_INSENSITIVE_ORDER)
        );
        return ResponseEntity.ok(summaries);
    }

    @PatchMapping("/{contactEmail}")
    public ResponseEntity<?> updatePreferences(
        @PathVariable String contactEmail,
        @Valid @RequestBody UpdateConversationPreferenceRequest request,
        OAuth2AuthenticationToken token
    ) {
        String ownerEmail = authenticatedEmail(token);
        String contact = normalizeEmail(contactEmail);
        if (ownerEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        if (!areAcceptedContacts(ownerEmail, contact)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Contact relationship required"));

        ConversationPreference preference = preferenceRepository
            .findByOwnerEmailAndContactEmail(ownerEmail, contact)
            .orElseGet(() -> new ConversationPreference(ownerEmail, contact));

        if (request.pinned() != null) preference.setPinned(request.pinned());
        if (request.muted() != null) preference.setMuted(request.muted());
        preference.setUpdatedAt(LocalDateTime.now());
        preferenceRepository.save(preference);

        return ResponseEntity.ok(Map.of(
            "pinned", preference.isPinned(),
            "muted", preference.isMuted()
        ));
    }

    @DeleteMapping("/{contactEmail}/messages")
    public ResponseEntity<?> clearConversation(@PathVariable String contactEmail, OAuth2AuthenticationToken token) {
        String ownerEmail = authenticatedEmail(token);
        String contact = normalizeEmail(contactEmail);
        if (ownerEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        if (!areAcceptedContacts(ownerEmail, contact)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Contact relationship required"));

        LocalDateTime clearedAt = LocalDateTime.now();
        ConversationPreference preference = preferenceRepository
            .findByOwnerEmailAndContactEmail(ownerEmail, contact)
            .orElseGet(() -> new ConversationPreference(ownerEmail, contact));
        preference.setClearedAt(clearedAt);
        preference.setUpdatedAt(clearedAt);
        preferenceRepository.save(preference);

        markIncomingAsRead(contact, ownerEmail, clearedAt);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{contactEmail}")
    public ResponseEntity<?> removeContact(@PathVariable String contactEmail, OAuth2AuthenticationToken token) {
        String ownerEmail = authenticatedEmail(token);
        String contact = normalizeEmail(contactEmail);
        if (ownerEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));

        List<ChatRequest> relationships = requestRepository.findAcceptedBetween(ownerEmail, contact);
        if (relationships.isEmpty()) return ResponseEntity.notFound().build();

        requestRepository.deleteAll(relationships);
        preferenceRepository.deleteByOwnerEmailAndContactEmail(ownerEmail, contact);
        preferenceRepository.deleteByOwnerEmailAndContactEmail(contact, ownerEmail);
        messagingTemplate.convertAndSendToUser(contact, "/queue/notifications", Map.of("type", "CONTACT_REMOVED"));
        return ResponseEntity.noContent().build();
    }

    private void markIncomingAsRead(String senderEmail, String recipientEmail, LocalDateTime readAt) {
        Query query = Query.query(Criteria.where("senderEmail").is(senderEmail)
            .and("recipientEmail").is(recipientEmail)
            .and("readAt").is(null));
        UpdateResult result = mongoTemplate.updateMulti(query, new Update().set("readAt", readAt), "messages");
        if (result.getModifiedCount() > 0) {
            messagingTemplate.convertAndSendToUser(senderEmail, "/queue/receipts", Map.of(
                "readerEmail", recipientEmail,
                "readAt", readAt.toString()
            ));
        }
    }

    private boolean areAcceptedContacts(String user1, String user2) {
        return user1 != null && user2 != null && !user1.equalsIgnoreCase(user2)
            && !requestRepository.findAcceptedBetween(user1, user2).isEmpty();
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
