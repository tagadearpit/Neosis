package com.neosis.dto;

public record UpdateUserSettingsRequest(
    Privacy privacy,
    Notifications notifications,
    Appearance appearance,
    Media media,
    Security security
) {
    public record Privacy(
        String lastSeen,
        String onlineStatus,
        String profilePhoto,
        String about,
        Boolean readReceipts,
        Boolean typingIndicators,
        String allowMessagesFrom,
        String allowGroupInvitesFrom
    ) {}

    public record Notifications(
        Boolean messageNotifications,
        Boolean groupNotifications,
        String sound,
        Boolean desktopNotifications,
        Boolean emailNotifications,
        String preview,
        String doNotDisturbStart,
        String doNotDisturbEnd
    ) {}

    public record Appearance(
        String theme,
        String accentColor,
        String fontSize,
        String bubbleDensity,
        Boolean compactMode
    ) {}

    public record Media(
        Boolean autoDownloadImages,
        Boolean autoDownloadVideos,
        Boolean autoDownloadFiles,
        Boolean linkPreviews,
        Boolean blockUnknownAttachments
    ) {}

    public record Security(
        Boolean highPrivacyMode,
        Boolean notifyNewLogin
    ) {}
}
