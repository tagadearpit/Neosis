package com.neosis.controller;

import com.neosis.dto.CreateReportRequest;
import com.neosis.model.AbuseReport;
import com.neosis.model.BlockedUser;
import com.neosis.model.ChatMessage;
import com.neosis.model.User;
import com.neosis.repository.AbuseReportRepository;
import com.neosis.repository.BlockedUserRepository;
import com.neosis.repository.ChatMessageRepository;
import com.neosis.repository.UserRepository;
import com.neosis.service.BlockService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/safety")
public class SafetyController {

    private static final Set<String> REPORT_CATEGORIES = Set.of("SPAM", "HARASSMENT", "IMPERSONATION", "ILLEGAL_CONTENT", "OTHER");

    private final BlockService blockService;
    private final BlockedUserRepository blockedUserRepository;
    private final AbuseReportRepository reportRepository;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;

    public SafetyController(
        BlockService blockService,
        BlockedUserRepository blockedUserRepository,
        AbuseReportRepository reportRepository,
        ChatMessageRepository messageRepository,
        UserRepository userRepository
    ) {
        this.blockService = blockService;
        this.blockedUserRepository = blockedUserRepository;
        this.reportRepository = reportRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/blocked")
    public ResponseEntity<?> blockedUsers(OAuth2AuthenticationToken token) {
        String email = authenticatedEmail(token);
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        List<BlockedUser> entries = blockedUserRepository.findByBlockerEmailOrderByCreatedAtDesc(email);
        Map<String, User> usersByEmail = userRepository.findByEmailIn(
            entries.stream().map(BlockedUser::getBlockedEmail).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(User::getEmail, user -> user));
        List<Map<String, Object>> blocked = entries.stream()
            .map(entry -> blockedResponse(entry, usersByEmail.get(entry.getBlockedEmail())))
            .toList();
        return ResponseEntity.ok(blocked);
    }

    @PostMapping("/blocked/{blockedEmail}")
    public ResponseEntity<?> block(@PathVariable String blockedEmail, OAuth2AuthenticationToken token) {
        String email = authenticatedEmail(token);
        String target = normalize(blockedEmail);
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        if (target == null || !userRepository.existsByEmail(target)) return ResponseEntity.notFound().build();
        return ResponseEntity.status(HttpStatus.CREATED).body(blockedResponse(blockService.block(email, target)));
    }

    @DeleteMapping("/blocked/{blockedEmail}")
    public ResponseEntity<?> unblock(@PathVariable String blockedEmail, OAuth2AuthenticationToken token) {
        String email = authenticatedEmail(token);
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        return blockService.unblock(email, blockedEmail) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/reports")
    public ResponseEntity<?> report(
        @Valid @RequestBody CreateReportRequest request,
        OAuth2AuthenticationToken token
    ) {
        String reporter = authenticatedEmail(token);
        String reported = normalize(request.reportedEmail());
        if (reporter == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        if (reported == null || reporter.equals(reported) || !userRepository.existsByEmail(reported)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid reported user"));
        }

        String category = request.category().trim().toUpperCase(Locale.ROOT);
        if (!REPORT_CATEGORIES.contains(category)) return ResponseEntity.badRequest().body(Map.of("error", "Invalid report category"));

        ChatMessage evidence = null;
        if (request.messageId() != null && !request.messageId().isBlank()) {
            evidence = messageRepository.findById(request.messageId()).orElse(null);
            if (evidence == null || !belongsToConversation(evidence, reporter, reported)) {
                return ResponseEntity.badRequest().body(Map.of("error", "The evidence message is not part of this conversation"));
            }
        }

        AbuseReport report = new AbuseReport();
        report.setReporterEmail(reporter);
        report.setReportedEmail(reported);
        report.setCategory(category);
        report.setDetails(request.details() == null ? null : request.details().trim());
        report.setMessageId(evidence == null ? null : evidence.getId());
        report.setMessageCreatedAt(evidence == null ? null : evidence.getCreatedAt());
        report.setCreatedAt(LocalDateTime.now());
        reportRepository.save(report);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", report.getId(), "status", report.getStatus()));
    }

    private Map<String, Object> blockedResponse(BlockedUser blocked) {
        return blockedResponse(blocked, userRepository.findByEmail(blocked.getBlockedEmail()));
    }

    private Map<String, Object> blockedResponse(BlockedUser blocked, User user) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("email", blocked.getBlockedEmail());
        result.put("name", user == null ? blocked.getBlockedEmail() : user.getName());
        result.put("blockedAt", blocked.getCreatedAt());
        return result;
    }

    private boolean belongsToConversation(ChatMessage message, String reporter, String reported) {
        return (reporter.equals(message.getSenderEmail()) && reported.equals(message.getRecipientEmail()))
            || (reported.equals(message.getSenderEmail()) && reporter.equals(message.getRecipientEmail()));
    }

    private String authenticatedEmail(OAuth2AuthenticationToken token) {
        if (token == null || token.getPrincipal() == null) return null;
        Object email = token.getPrincipal().getAttributes().get("email");
        return normalize(email == null ? token.getName() : email.toString());
    }

    private String normalize(String email) {
        if (email == null) return null;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
