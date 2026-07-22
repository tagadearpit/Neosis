package com.neosis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Locale;

@Document(collection = "user_settings")
public class UserSettings {

    public static final int CURRENT_SCHEMA_VERSION = 1;

    @Id
    private String id;

    @Indexed(unique = true)
    private String ownerEmail;

    private int schemaVersion = CURRENT_SCHEMA_VERSION;
    private Privacy privacy = Privacy.defaults();
    private Notifications notifications = Notifications.defaults();
    private Appearance appearance = Appearance.defaults();
    private Media media = Media.defaults();
    private Security security = Security.defaults();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public UserSettings() {}

    public UserSettings(String ownerEmail) {
        setOwnerEmail(ownerEmail);
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOwnerEmail() { return ownerEmail; }
    public void setOwnerEmail(String ownerEmail) {
        this.ownerEmail = ownerEmail == null ? null : ownerEmail.trim().toLowerCase(Locale.ROOT);
    }

    public int getSchemaVersion() { return schemaVersion; }
    public void setSchemaVersion(int schemaVersion) { this.schemaVersion = schemaVersion; }

    public Privacy getPrivacy() { return privacy == null ? Privacy.defaults() : privacy; }
    public void setPrivacy(Privacy privacy) { this.privacy = privacy; }

    public Notifications getNotifications() { return notifications == null ? Notifications.defaults() : notifications; }
    public void setNotifications(Notifications notifications) { this.notifications = notifications; }

    public Appearance getAppearance() { return appearance == null ? Appearance.defaults() : appearance; }
    public void setAppearance(Appearance appearance) { this.appearance = appearance; }

    public Media getMedia() { return media == null ? Media.defaults() : media; }
    public void setMedia(Media media) { this.media = media; }

    public Security getSecurity() { return security == null ? Security.defaults() : security; }
    public void setSecurity(Security security) { this.security = security; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public record Privacy(
        String lastSeen,
        String onlineStatus,
        String profilePhoto,
        String about,
        boolean readReceipts,
        boolean typingIndicators,
        String allowMessagesFrom,
        String allowGroupInvitesFrom
    ) {
        public static Privacy defaults() {
            return new Privacy("CONTACTS", "CONTACTS", "CONTACTS", "CONTACTS", true, true, "CONTACTS", "CONTACTS");
        }
    }

    public record Notifications(
        boolean messageNotifications,
        boolean groupNotifications,
        String sound,
        boolean desktopNotifications,
        boolean emailNotifications,
        String preview,
        String doNotDisturbStart,
        String doNotDisturbEnd
    ) {
        public static Notifications defaults() {
            return new Notifications(true, true, "CHIME", false, false, "FULL", null, null);
        }
    }

    public record Appearance(
        String theme,
        String accentColor,
        String fontSize,
        String bubbleDensity,
        boolean compactMode
    ) {
        public static Appearance defaults() {
            return new Appearance("SYSTEM", "#0fa384", "MEDIUM", "COMFORTABLE", false);
        }
    }

    public record Media(
        boolean autoDownloadImages,
        boolean autoDownloadVideos,
        boolean autoDownloadFiles,
        boolean linkPreviews,
        boolean blockUnknownAttachments
    ) {
        public static Media defaults() {
            return new Media(true, false, false, true, true);
        }
    }

    public record Security(
        boolean highPrivacyMode,
        boolean notifyNewLogin
    ) {
        public static Security defaults() {
            return new Security(false, true);
        }
    }
}
