package com.neosis.controller;

import com.neosis.dto.ConversationSummary;
import com.neosis.dto.UpdateConversationPreferenceRequest;
import com.neosis.model.ChatRequest;
import com.neosis.model.ConversationPreference;
import com.neosis.model.User;
import com.neosis.repository.ChatRequestRepository;
import com.neosis.repository.ConversationPreferenceRepository;
import com.neosis.repository.UserRepository;
import com.neosis.service.BlockService;
import com.neosis.service.UserSettingsService;
import com.mongodb.client.result.UpdateResult;
import org.bson.Document;
import jakarta.validation.Valid;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
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
import java.util.HashMap;
import java.util.HashSet;
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
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final BlockService blockService;
    private final UserSettingsService settingsService;

    public ConversationController(
        ChatRequestRepository requestRepository,
        ConversationPreferenceRepository preferenceRepository,
        UserRepository userRepository,
        MongoTemplate mongoTemplate,
        SimpMessagingTemplate messagingTemplate,
        BlockService blockService,
        UserSettingsService settingsService
    ) {
        this.requestRepository = requestRepository;
        this.preferenceRepository = preferenceRepository;
        this.userRepository = userRepository;
        this.mongoTemplate = mongoTemplate;
        this.messagingTemplate = messagingTemplate;
        this.blockService = blockService;
        this.settingsService = settingsService;
    }

    @GetMapping
    public ResponseEntity<?> listConversations(OAuth2AuthenticationToken token) {
        String ownerEmail = authenticatedEmail(token);
        if (ownerEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));

        List<ChatRequest> relationships = requestRepository.findAllAcceptedForUser(ownerEmail);
        Set<String> relationshipEmails = relationships.stream()
            .map(req -> req.getSenderEmail().equalsIgnoreCase(ownerEmail) ? req.getReceiverEmail() : req.getSenderEmail())
            .collect(Collectors.toCollection(HashSet::new));
        Set<String> blockedEmails = blockService.blockedContacts(ownerEmail, relationshipEmails);
        Set<String> contactEmails = relationshipEmails.stream()
            .filter(contact -> !blockedEmails.contains(contact))
            .collect(Collectors.toSet());

        Map<String, User> usersByEmail = userRepository.findByEmailIn(contactEmails).stream()
            .collect(Collectors.toMap(User::getEmail, user -> user));
        var settingsByEmail = settingsService.findForUsers(contactEmails);
        Map<String, ConversationPreference> preferencesByContact = preferenceRepository.findByOwnerEmail(ownerEmail).stream()
            .collect(Collectors.toMap(ConversationPreference::getContactEmail, pref -> pref, (first, ignored) -> first));
        Map<String, Long> unreadByContact = unreadCounts(ownerEmail, contactEmails);

        List<ConversationSummary> summaries = new ArrayList<>();
        for (String contactEmail : contactEmails) {
            User contact = usersByEmail.get(contactEmail);
            ConversationPreference preference = preferencesByContact.get(contactEmail);
            var contactSettings = settingsByEmail.get(contactEmail);
            int at = contactEmail.indexOf('@');
            String fallbackName = at > 0 ? contactEmail.substring(0, at) : contactEmail;

            summaries.add(new ConversationSummary(
                contactEmail,
                contact == null || contact.getName() == null || contact.getName().isBlank() ? fallbackName : contact.getName(),
                contact == null || "NOBODY".equals(contactSettings.getPrivacy().about()) ? "" : contact.getStatusMessage(),
                preference != null && preference.isPinned(),
                preference != null && preference.isMuted(),
                preference == null ? null : preference.getMutedUntil(),
                preference == null ? 0 : preference.getDisappearingMessagesSeconds(),
                unreadByContact.getOrDefault(contactEmail, 0L),
                contact != null && contact.getLastSeenAt() != null
                    && contact.getLastSeenAt().isAfter(LocalDateTime.now().minusMinutes(2))
                    && !"NOBODY".equals(contactSettings.getPrivacy().onlineStatus()),
                contact == null || "NOBODY".equals(contactSettings.getPrivacy().lastSeen()) ? null : contact.getLastSeenAt(),
                !"NOBODY".equals(contactSettings.getPrivacy().allowMessagesFrom())
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
        if (request.muteDuration() != null) applyMuteDuration(preference, request.muteDuration());
        else if (request.muted() != null) {
            preference.setMuted(request.muted());
            preference.setMutedUntil(null);
        }
        if (request.disappearingMessagesSeconds() != null) {
            int seconds = request.disappearingMessagesSeconds();
            if (!Set.of(0, 86_400, 604_800, 7_776_000).contains(seconds)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid disappearing message duration"));
            }
            preference.setDisappearingMessagesSeconds(seconds);
        }
        preference.setUpdatedAt(LocalDateTime.now());
        preferenceRepository.save(preference);

        Map<String, Object> result = new HashMap<>();
        result.put("pinned", preference.isPinned());
        result.put("muted", preference.isMuted());
        result.put("mutedUntil", preference.getMutedUntil());
        result.put("disappearingMessagesSeconds", preference.getDisappearingMessagesSeconds());
        return ResponseEntity.ok(result);
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

        if (contact == null) return ResponseEntity.badRequest().body(Map.of("error", "Invalid contact"));
        long removed = requestRepository.deleteByPairKeyAndStatus(ChatRequest.buildPairKey(ownerEmail, contact), "ACCEPTED");
        if (removed == 0) return ResponseEntity.notFound().build();

        preferenceRepository.deleteByOwnerEmailAndContactEmail(ownerEmail, contact);
        preferenceRepository.deleteByOwnerEmailAndContactEmail(contact, ownerEmail);
        messagingTemplate.convertAndSendToUser(contact, "/queue/notifications", Map.of("type", "CONTACT_REMOVED"));
        return ResponseEntity.noContent().build();
    }

    private void markIncomingAsRead(String senderEmail, String recipientEmail, LocalDateTime readAt) {
        Query query = Query.query(new Criteria().andOperator(
            Criteria.where("senderEmail").is(senderEmail),
            Criteria.where("recipientEmail").is(recipientEmail),
            Criteria.where("readAt").is(null),
            new Criteria().orOperator(
                Criteria.where("expiresAt").is(null),
                Criteria.where("expiresAt").gt(readAt)
            )
        ));
        UpdateResult result = mongoTemplate.updateMulti(query, new Update().set("readAt", readAt), "messages");
        if (result.getModifiedCount() > 0 && settingsService.readReceiptsEnabled(recipientEmail)) {
            messagingTemplate.convertAndSendToUser(senderEmail, "/queue/receipts", Map.of(
                "readerEmail", recipientEmail,
                "readAt", readAt.toString()
            ));
        }
    }

    private boolean areAcceptedContacts(String user1, String user2) {
        return user1 != null && user2 != null && !user1.equalsIgnoreCase(user2)
            && !blockService.isEitherBlocked(user1, user2)
            && requestRepository.existsByPairKeyAndStatus(ChatRequest.buildPairKey(user1, user2), "ACCEPTED");
    }

    private Map<String, Long> unreadCounts(String ownerEmail, Set<String> contactEmails) {
        if (contactEmails.isEmpty()) return Map.of();

        Aggregation aggregation = Aggregation.newAggregation(
            Aggregation.match(new Criteria().andOperator(
                Criteria.where("recipientEmail").is(ownerEmail),
                Criteria.where("readAt").is(null),
                Criteria.where("senderEmail").in(contactEmails),
                new Criteria().orOperator(Criteria.where("expiresAt").is(null), Criteria.where("expiresAt").gt(LocalDateTime.now()))
            )),
            Aggregation.group("senderEmail").count().as("count")
        );

        Map<String, Long> counts = new HashMap<>();
        for (Document result : mongoTemplate.aggregate(aggregation, "messages", Document.class).getMappedResults()) {
            Object sender = result.get("_id");
            Object count = result.get("count");
            if (sender instanceof String email && count instanceof Number number) {
                counts.put(email, number.longValue());
            }
        }
        return counts;
    }

    private void applyMuteDuration(ConversationPreference preference, String duration) {
        String value = duration.trim().toUpperCase(Locale.ROOT);
        LocalDateTime now = LocalDateTime.now();
        switch (value) {
            case "OFF" -> {
                preference.setMuted(false);
                preference.setMutedUntil(null);
            }
            case "15_MINUTES" -> {
                preference.setMuted(true);
                preference.setMutedUntil(now.plusMinutes(15));
            }
            case "1_HOUR" -> {
                preference.setMuted(true);
                preference.setMutedUntil(now.plusHours(1));
            }
            case "8_HOURS" -> {
                preference.setMuted(true);
                preference.setMutedUntil(now.plusHours(8));
            }
            case "FOREVER" -> {
                preference.setMuted(true);
                preference.setMutedUntil(null);
            }
            default -> throw new IllegalArgumentException("Invalid mute duration");
        }
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
