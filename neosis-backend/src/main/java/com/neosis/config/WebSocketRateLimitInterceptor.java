package com.neosis.config;

import com.neosis.model.User;
import com.neosis.repository.UserRepository;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class WebSocketRateLimitInterceptor implements ChannelInterceptor {

    private static final long WINDOW_MS = 60_000L;
    private static final int MAX_BUCKETS = 20_000;
    private static final Set<String> ALLOWED_SUBSCRIPTIONS = Set.of(
        "/user/queue/messages",
        "/user/queue/receipts",
        "/user/queue/typing",
        "/user/queue/signaling",
        "/user/queue/notifications"
    );
    private static final Map<String, Integer> SEND_LIMITS = Map.of(
        "/app/chat.send", 120,
        "/app/chat.typing", 240,
        "/app/chat.signal", 240
    );

    private final UserRepository userRepository;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final AtomicLong nextCleanupMs = new AtomicLong();

    public WebSocketRateLimitInterceptor(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;

        StompCommand command = accessor.getCommand();
        if (command == StompCommand.DISCONNECT || command == StompCommand.UNSUBSCRIBE) return message;

        Principal principal = accessor.getUser();
        String identity = principal == null ? null : normalize(principal.getName());
        if (identity == null) throw new MessageDeliveryException("Authenticated WebSocket session required");

        if (command == StompCommand.CONNECT || command == StompCommand.STOMP) {
            User user = userRepository.findByEmail(identity);
            if (user == null || !user.isTermsAccepted()) {
                throw new MessageDeliveryException("Terms must be accepted before connecting");
            }
            enforce(identity + ":connect", 30);
            return message;
        }

        String destination = accessor.getDestination();
        if (command == StompCommand.SUBSCRIBE) {
            if (!ALLOWED_SUBSCRIPTIONS.contains(destination)) {
                throw new MessageDeliveryException("WebSocket subscription is not allowed");
            }
            enforce(identity + ":subscribe", 60);
            return message;
        }

        if (command == StompCommand.SEND) {
            Integer limit = SEND_LIMITS.get(destination);
            if (limit == null) throw new MessageDeliveryException("WebSocket destination is not allowed");
            enforce(identity + ":" + destination, limit);
        }

        return message;
    }

    private void enforce(String key, int limit) {
        long now = Instant.now().toEpochMilli();
        cleanupIfDue(now);
        if (!buckets.containsKey(key) && buckets.size() >= MAX_BUCKETS) {
            throw new MessageDeliveryException("WebSocket capacity limit exceeded");
        }

        Bucket bucket = buckets.compute(key, (ignored, current) -> {
            if (current == null || now - current.windowStartMs() >= WINDOW_MS) return new Bucket(now, 1);
            return new Bucket(current.windowStartMs(), current.count() + 1);
        });
        if (bucket.count() > limit) throw new MessageDeliveryException("WebSocket rate limit exceeded");
    }

    private void cleanupIfDue(long now) {
        long scheduled = nextCleanupMs.get();
        if (now < scheduled || !nextCleanupMs.compareAndSet(scheduled, now + WINDOW_MS)) return;
        buckets.entrySet().removeIf(entry -> now - entry.getValue().windowStartMs() >= WINDOW_MS * 2);
    }

    private String normalize(String value) {
        if (value == null) return null;
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }

    private record Bucket(long windowStartMs, int count) {}
}
