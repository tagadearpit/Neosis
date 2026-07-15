package com.neosis.dto;

public record ConversationSummary(
    String email,
    String name,
    String statusMessage,
    boolean pinned,
    boolean muted,
    long unreadCount
) {}
