package com.neosis.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;
    private static final int MAX_BUCKETS = 20_000;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final AtomicLong nextCleanupMs = new AtomicLong();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {

        Policy policy = policyFor(request.getMethod(), request.getRequestURI());
        if (policy == null) {
            filterChain.doFilter(request, response);
            return;
        }

        Decision decision = take(identityFor(request) + ":" + policy.scope(), policy.limit());
        response.setHeader("RateLimit-Limit", String.valueOf(policy.limit()));
        response.setHeader("RateLimit-Remaining", String.valueOf(decision.remaining()));
        response.setHeader("RateLimit-Reset", String.valueOf(decision.resetAfterSeconds()));

        if (!decision.allowed()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(decision.resetAfterSeconds()));
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too many requests. Try again shortly.\",\"code\":\"RATE_LIMITED\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private Policy policyFor(String method, String path) {
        if (path.startsWith("/actuator/health")) return null;
        if (path.startsWith("/oauth2/authorization/")) return new Policy("oauth-start", 30);
        if (path.startsWith("/login/oauth2/code/")) return new Policy("oauth-callback", 60);
        if (!path.startsWith("/api/")) return null;

        if ("POST".equalsIgnoreCase(method) && path.equals("/api/chat/upload")) return new Policy("chat-upload", 20);
        if ("POST".equalsIgnoreCase(method) && path.equals("/api/contacts/request")) return new Policy("contact-request", 30);
        if ("POST".equalsIgnoreCase(method) && (path.equals("/api/contacts/accept") || path.equals("/api/contacts/reject"))) {
            return new Policy("contact-response", 60);
        }
        if ("DELETE".equalsIgnoreCase(method) && path.equals("/api/users/me")) return new Policy("account-delete", 5);
        if ("DELETE".equalsIgnoreCase(method) && path.startsWith("/api/conversations/")) return new Policy("conversation-delete", 30);

        int limit = "GET".equalsIgnoreCase(method) ? 600 : 180;
        return new Policy(method.toUpperCase(Locale.ROOT) + ":" + apiScope(path), limit);
    }

    private String apiScope(String path) {
        String relative = path.substring("/api/".length());
        int slash = relative.indexOf('/');
        return slash < 0 ? relative : relative.substring(0, slash);
    }

    private String identityFor(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
            && authentication.getName() != null && !authentication.getName().isBlank()) {
            return "user:" + authentication.getName().trim().toLowerCase(Locale.ROOT);
        }
        return "ip:" + request.getRemoteAddr();
    }

    private Decision take(String key, int limit) {
        long now = Instant.now().toEpochMilli();
        cleanupIfDue(now);

        if (!buckets.containsKey(key) && buckets.size() >= MAX_BUCKETS) {
            return new Decision(false, 0, 60);
        }

        Bucket bucket = buckets.compute(key, (ignored, current) -> {
            if (current == null || now - current.windowStartMs() >= WINDOW_MS) {
                return new Bucket(now, 1);
            }
            return new Bucket(current.windowStartMs(), current.count() + 1);
        });

        long resetMs = Math.max(1, WINDOW_MS - (now - bucket.windowStartMs()));
        return new Decision(
            bucket.count() <= limit,
            Math.max(0, limit - bucket.count()),
            Math.max(1, (resetMs + 999) / 1_000)
        );
    }

    private void cleanupIfDue(long now) {
        long scheduled = nextCleanupMs.get();
        if (now < scheduled || !nextCleanupMs.compareAndSet(scheduled, now + WINDOW_MS)) return;
        buckets.entrySet().removeIf(entry -> now - entry.getValue().windowStartMs() >= WINDOW_MS * 2);
    }

    private record Policy(String scope, int limit) {}
    private record Bucket(long windowStartMs, int count) {}
    private record Decision(boolean allowed, int remaining, long resetAfterSeconds) {}
}
