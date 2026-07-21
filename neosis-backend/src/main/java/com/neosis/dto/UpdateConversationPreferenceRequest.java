package com.neosis.dto;

public record UpdateConversationPreferenceRequest(
    Boolean pinned,
    Boolean muted,
    String muteDuration,
    Integer disappearingMessagesSeconds
) {}
