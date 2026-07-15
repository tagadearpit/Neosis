package com.neosis.dto;

public record UpdateConversationPreferenceRequest(
    Boolean pinned,
    Boolean muted
) {}
