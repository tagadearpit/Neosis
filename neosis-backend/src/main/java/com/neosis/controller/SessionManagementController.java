package com.neosis.controller;

import com.neosis.model.LoginEvent;
import com.neosis.repository.LoginEventRepository;
import com.neosis.service.LoginAuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/security")
public class SessionManagementController {

    private final FindByIndexNameSessionRepository<? extends Session> sessionRepository;
    private final LoginEventRepository loginEventRepository;

    public SessionManagementController(
        FindByIndexNameSessionRepository<? extends Session> sessionRepository,
        LoginEventRepository loginEventRepository
    ) {
        this.sessionRepository = sessionRepository;
        this.loginEventRepository = loginEventRepository;
    }

    @GetMapping("/sessions")
    public ResponseEntity<?> sessions(OAuth2AuthenticationToken token, HttpServletRequest request) {
        String email = authenticatedEmail(token);
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        HttpSession current = request.getSession(false);
        String currentId = current == null ? null : current.getId();

        List<Map<String, Object>> sessions = sessionRepository.findByPrincipalName(email).values().stream()
            .sorted(Comparator.comparing((Session session) -> session.getLastAccessedTime()).reversed())
            .map(session -> sessionResponse(session, session.getId().equals(currentId)))
            .toList();
        return ResponseEntity.ok(sessions);
    }

    @DeleteMapping("/sessions/{fingerprint}")
    public ResponseEntity<?> revokeSession(
        @PathVariable String fingerprint,
        OAuth2AuthenticationToken token,
        HttpServletRequest request
    ) {
        String email = authenticatedEmail(token);
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));

        Session matching = sessionRepository.findByPrincipalName(email).values().stream()
            .filter(session -> fingerprint(session.getId()).equals(fingerprint))
            .findFirst()
            .orElse(null);
        if (matching == null) return ResponseEntity.notFound().build();

        sessionRepository.deleteById(matching.getId());
        HttpSession current = request.getSession(false);
        if (current != null && current.getId().equals(matching.getId())) current.invalidate();
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/sessions")
    public ResponseEntity<?> revokeOtherSessions(OAuth2AuthenticationToken token, HttpServletRequest request) {
        String email = authenticatedEmail(token);
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        HttpSession current = request.getSession(false);
        String currentId = current == null ? null : current.getId();

        long revoked = 0;
        for (Session session : sessionRepository.findByPrincipalName(email).values()) {
            if (!session.getId().equals(currentId)) {
                sessionRepository.deleteById(session.getId());
                revoked++;
            }
        }
        return ResponseEntity.ok(Map.of("revoked", revoked));
    }

    @GetMapping("/login-history")
    public ResponseEntity<?> loginHistory(OAuth2AuthenticationToken token) {
        String email = authenticatedEmail(token);
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        List<LoginEvent> events = loginEventRepository.findByOwnerEmailOrderByCreatedAtDesc(email, PageRequest.of(0, 25));
        return ResponseEntity.ok(events.stream().map(this::loginResponse).toList());
    }

    private Map<String, Object> sessionResponse(Session session, boolean current) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", fingerprint(session.getId()));
        result.put("current", current);
        result.put("device", attribute(session, LoginAuditService.DEVICE_ATTRIBUTE, "Unknown device"));
        result.put("browser", attribute(session, LoginAuditService.BROWSER_ATTRIBUTE, "Unknown browser"));
        result.put("maskedIp", attribute(session, LoginAuditService.IP_ATTRIBUTE, "Unknown"));
        result.put("createdAt", session.getCreationTime());
        result.put("lastAccessedAt", session.getLastAccessedTime());
        result.put("expiresAt", session.getLastAccessedTime().plus(session.getMaxInactiveInterval()));
        return result;
    }

    private Map<String, Object> loginResponse(LoginEvent event) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", event.getId());
        result.put("method", event.getMethod());
        result.put("device", event.getDevice());
        result.put("browser", event.getBrowser());
        result.put("maskedIp", event.getMaskedIp());
        result.put("successful", event.isSuccessful());
        result.put("createdAt", event.getCreatedAt());
        return result;
    }

    private String attribute(Session session, String name, String fallback) {
        Object value = session.getAttribute(name);
        return value == null ? fallback : value.toString();
    }

    private String fingerprint(String sessionId) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(sessionId.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest, 0, 8);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private String authenticatedEmail(OAuth2AuthenticationToken token) {
        if (token == null || token.getPrincipal() == null) return null;
        Object email = token.getPrincipal().getAttributes().get("email");
        String value = email == null ? token.getName() : email.toString();
        if (value == null) return null;
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
