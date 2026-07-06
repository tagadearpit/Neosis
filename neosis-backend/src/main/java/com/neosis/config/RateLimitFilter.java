package com.neosis.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {

        String path = request.getRequestURI();
        int limit = limitFor(request.getMethod(), path);
        if (limit > 0 && !allow(request, path, limit)) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too many requests. Try again shortly.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private int limitFor(String method, String path) {
        if ("POST".equalsIgnoreCase(method) && path.equals("/api/chat/upload")) return 20;
        if ("POST".equalsIgnoreCase(method) && path.equals("/api/contacts/request")) return 30;
        if ("GET".equalsIgnoreCase(method) && path.equals("/api/users/check")) return 60;
        return -1;
    }

    private boolean allow(HttpServletRequest request, String path, int limit) {
        long now = Instant.now().toEpochMilli();
        String identity = request.getSession(false) != null ? request.getSession(false).getId() : request.getRemoteAddr();
        String key = identity + ":" + path;
        Bucket bucket = buckets.compute(key, (ignored, existing) -> {
            if (existing == null || now - existing.windowStartMs >= WINDOW_MS) {
                return new Bucket(now, 1);
            }
            existing.count++;
            return existing;
        });
        cleanup(now);
        return bucket.count <= limit;
    }

    private void cleanup(long now) {
        if (buckets.size() < 5_000) return;
        buckets.entrySet().removeIf(entry -> now - entry.getValue().windowStartMs > WINDOW_MS * 2);
    }

    private static class Bucket {
        private final long windowStartMs;
        private int count;

        private Bucket(long windowStartMs, int count) {
            this.windowStartMs = windowStartMs;
            this.count = count;
        }
    }
}
