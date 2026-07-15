package com.neosis.config;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketRateLimitInterceptor implements ChannelInterceptor {

    private static final long WINDOW_MS = 60_000L;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() != StompCommand.SEND) return message;

        String destination = accessor.getDestination();
        int limit = switch (destination == null ? "" : destination) {
            case "/app/chat.send" -> 120;
            case "/app/chat.typing" -> 240;
            case "/app/chat.signal" -> 240;
            default -> -1;
        };
        if (limit < 0) return message;

        Principal principal = accessor.getUser();
        String identity = principal == null ? accessor.getSessionId() : principal.getName();
        if (identity == null || !allow(identity + ":" + destination, limit)) {
            throw new MessageDeliveryException("WebSocket rate limit exceeded");
        }
        return message;
    }

    private boolean allow(String key, int limit) {
        long now = Instant.now().toEpochMilli();
        Bucket bucket = buckets.compute(key, (ignored, existing) -> {
            if (existing == null || now - existing.windowStartMs >= WINDOW_MS) return new Bucket(now, 1);
            existing.count++;
            return existing;
        });

        if (buckets.size() > 10_000) {
            buckets.entrySet().removeIf(entry -> now - entry.getValue().windowStartMs > WINDOW_MS * 2);
        }
        return bucket.count <= limit;
    }

    private static final class Bucket {
        private final long windowStartMs;
        private int count;

        private Bucket(long windowStartMs, int count) {
            this.windowStartMs = windowStartMs;
            this.count = count;
        }
    }
}
