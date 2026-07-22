package com.neosis.dto;

import java.time.LocalDateTime;

public record ConversationSummary(
    String email,
    String name,
    String statusMessage,
    boolean pinned,
    boolean muted,
    LocalDateTime mutedUntil,
    int disappearingMessagesSeconds,
    long unreadCount,
    boolean online,
    LocalDateTime lastSeenAt,
    boolean canMessage
) {}
