package com.neosis.dto;

public record UpdateUserPreferencesRequest(
    Boolean notificationSoundsEnabled,
    Boolean typingIndicatorsEnabled
) {}
