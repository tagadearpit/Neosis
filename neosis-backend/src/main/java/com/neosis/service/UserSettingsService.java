package com.neosis.service;

import com.neosis.dto.UpdateUserSettingsRequest;
import com.neosis.model.User;
import com.neosis.model.UserSettings;
import com.neosis.repository.UserRepository;
import com.neosis.repository.UserSettingsRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserSettingsService {

    private static final Set<String> VISIBILITY = Set.of("EVERYONE", "CONTACTS", "NOBODY");
    private static final Set<String> THEMES = Set.of("LIGHT", "DARK", "SYSTEM");
    private static final Set<String> SOUNDS = Set.of("CHIME", "SOFT", "NONE");
    private static final Set<String> PREVIEWS = Set.of("FULL", "SENDER", "HIDDEN");
    private static final Set<String> FONT_SIZES = Set.of("SMALL", "MEDIUM", "LARGE");
    private static final Set<String> DENSITIES = Set.of("COMFORTABLE", "COMPACT");

    private final UserSettingsRepository settingsRepository;
    private final UserRepository userRepository;

    public UserSettingsService(UserSettingsRepository settingsRepository, UserRepository userRepository) {
        this.settingsRepository = settingsRepository;
        this.userRepository = userRepository;
    }

    public UserSettings getOrCreate(String email) {
        return settingsRepository.findByOwnerEmail(normalizeEmail(email)).orElseGet(() -> create(email));
    }

    public Map<String, UserSettings> findForUsers(Collection<String> ownerEmails) {
        if (ownerEmails == null || ownerEmails.isEmpty()) return Map.of();
        Set<String> normalizedEmails = ownerEmails.stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .map(value -> value.toLowerCase(Locale.ROOT))
            .collect(Collectors.toSet());
        if (normalizedEmails.isEmpty()) return Map.of();

        Map<String, UserSettings> settingsByEmail = new HashMap<>();
        settingsRepository.findByOwnerEmailIn(normalizedEmails).stream()
            .filter(settings -> settings.getOwnerEmail() != null)
            .forEach(settings -> settingsByEmail.put(settings.getOwnerEmail(), settings));
        normalizedEmails.forEach(email -> settingsByEmail.putIfAbsent(email, new UserSettings(email)));
        return Map.copyOf(settingsByEmail);
    }

    public UserSettings update(String email, UpdateUserSettingsRequest request) {
        if (request == null) throw new IllegalArgumentException("Settings payload is required");
        UserSettings settings = getOrCreate(email);

        if (request.privacy() != null) settings.setPrivacy(mergePrivacy(settings.getPrivacy(), request.privacy()));
        if (request.notifications() != null) settings.setNotifications(mergeNotifications(settings.getNotifications(), request.notifications()));
        if (request.appearance() != null) settings.setAppearance(mergeAppearance(settings.getAppearance(), request.appearance()));
        if (request.media() != null) settings.setMedia(mergeMedia(settings.getMedia(), request.media()));
        if (request.security() != null) settings.setSecurity(mergeSecurity(settings.getSecurity(), request.security()));

        if (settings.getSecurity().highPrivacyMode()) applyHighPrivacy(settings);
        settings.setSchemaVersion(UserSettings.CURRENT_SCHEMA_VERSION);
        settings.setUpdatedAt(LocalDateTime.now());
        return settingsRepository.save(settings);
    }

    public boolean readReceiptsEnabled(String email) {
        return getOrCreate(email).getPrivacy().readReceipts();
    }

    public boolean typingIndicatorsEnabled(String email) {
        return getOrCreate(email).getPrivacy().typingIndicators();
    }

    public boolean attachmentsFromUnknownBlocked(String email) {
        return getOrCreate(email).getMedia().blockUnknownAttachments();
    }

    public String messagesVisibility(String email) {
        return getOrCreate(email).getPrivacy().allowMessagesFrom();
    }

    public Map<String, Object> toResponse(UserSettings settings) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("schemaVersion", settings.getSchemaVersion());
        result.put("privacy", settings.getPrivacy());
        result.put("notifications", settings.getNotifications());
        result.put("appearance", settings.getAppearance());
        result.put("media", settings.getMedia());
        result.put("security", settings.getSecurity());
        result.put("updatedAt", settings.getUpdatedAt());
        return result;
    }

    private UserSettings create(String email) {
        UserSettings settings = new UserSettings(email);
        User user = userRepository.findByEmail(normalizeEmail(email));
        if (user != null) {
            UserSettings.Privacy privacy = settings.getPrivacy();
            settings.setPrivacy(new UserSettings.Privacy(
                privacy.lastSeen(), privacy.onlineStatus(), privacy.profilePhoto(), privacy.about(),
                privacy.readReceipts(), user.isTypingIndicatorsEnabled(), privacy.allowMessagesFrom(), privacy.allowGroupInvitesFrom()
            ));
            UserSettings.Notifications notifications = settings.getNotifications();
            settings.setNotifications(new UserSettings.Notifications(
                notifications.messageNotifications(), notifications.groupNotifications(),
                user.isNotificationSoundsEnabled() ? notifications.sound() : "NONE",
                notifications.desktopNotifications(), notifications.emailNotifications(), notifications.preview(),
                notifications.doNotDisturbStart(), notifications.doNotDisturbEnd()
            ));
        }
        try {
            return settingsRepository.save(settings);
        } catch (DuplicateKeyException ignored) {
            return settingsRepository.findByOwnerEmail(normalizeEmail(email)).orElseThrow();
        }
    }

    private UserSettings.Privacy mergePrivacy(UserSettings.Privacy current, UpdateUserSettingsRequest.Privacy update) {
        return new UserSettings.Privacy(
            enumValue(update.lastSeen(), current.lastSeen(), VISIBILITY, "last seen visibility"),
            enumValue(update.onlineStatus(), current.onlineStatus(), VISIBILITY, "online status visibility"),
            enumValue(update.profilePhoto(), current.profilePhoto(), VISIBILITY, "profile photo visibility"),
            enumValue(update.about(), current.about(), VISIBILITY, "about visibility"),
            value(update.readReceipts(), current.readReceipts()),
            value(update.typingIndicators(), current.typingIndicators()),
            enumValue(update.allowMessagesFrom(), current.allowMessagesFrom(), VISIBILITY, "message request visibility"),
            enumValue(update.allowGroupInvitesFrom(), current.allowGroupInvitesFrom(), VISIBILITY, "group invite visibility")
        );
    }

    private UserSettings.Notifications mergeNotifications(UserSettings.Notifications current, UpdateUserSettingsRequest.Notifications update) {
        String start = timeValue(update.doNotDisturbStart(), current.doNotDisturbStart());
        String end = timeValue(update.doNotDisturbEnd(), current.doNotDisturbEnd());
        if ((start == null) != (end == null)) throw new IllegalArgumentException("Both do-not-disturb times are required");
        return new UserSettings.Notifications(
            value(update.messageNotifications(), current.messageNotifications()),
            value(update.groupNotifications(), current.groupNotifications()),
            enumValue(update.sound(), current.sound(), SOUNDS, "notification sound"),
            value(update.desktopNotifications(), current.desktopNotifications()),
            value(update.emailNotifications(), current.emailNotifications()),
            enumValue(update.preview(), current.preview(), PREVIEWS, "notification preview"),
            start,
            end
        );
    }

    private UserSettings.Appearance mergeAppearance(UserSettings.Appearance current, UpdateUserSettingsRequest.Appearance update) {
        return new UserSettings.Appearance(
            enumValue(update.theme(), current.theme(), THEMES, "theme"),
            accentValue(update.accentColor(), current.accentColor()),
            enumValue(update.fontSize(), current.fontSize(), FONT_SIZES, "font size"),
            enumValue(update.bubbleDensity(), current.bubbleDensity(), DENSITIES, "message density"),
            value(update.compactMode(), current.compactMode())
        );
    }

    private UserSettings.Media mergeMedia(UserSettings.Media current, UpdateUserSettingsRequest.Media update) {
        return new UserSettings.Media(
            value(update.autoDownloadImages(), current.autoDownloadImages()),
            value(update.autoDownloadVideos(), current.autoDownloadVideos()),
            value(update.autoDownloadFiles(), current.autoDownloadFiles()),
            value(update.linkPreviews(), current.linkPreviews()),
            value(update.blockUnknownAttachments(), current.blockUnknownAttachments())
        );
    }

    private UserSettings.Security mergeSecurity(UserSettings.Security current, UpdateUserSettingsRequest.Security update) {
        return new UserSettings.Security(
            value(update.highPrivacyMode(), current.highPrivacyMode()),
            value(update.notifyNewLogin(), current.notifyNewLogin())
        );
    }

    private void applyHighPrivacy(UserSettings settings) {
        UserSettings.Privacy privacy = settings.getPrivacy();
        settings.setPrivacy(new UserSettings.Privacy(
            "NOBODY", "NOBODY", privacy.profilePhoto(), privacy.about(), false, false,
            "CONTACTS", privacy.allowGroupInvitesFrom()
        ));
        UserSettings.Notifications notifications = settings.getNotifications();
        settings.setNotifications(new UserSettings.Notifications(
            notifications.messageNotifications(), notifications.groupNotifications(), notifications.sound(),
            notifications.desktopNotifications(), notifications.emailNotifications(), "HIDDEN",
            notifications.doNotDisturbStart(), notifications.doNotDisturbEnd()
        ));
        UserSettings.Media media = settings.getMedia();
        settings.setMedia(new UserSettings.Media(
            media.autoDownloadImages(), false, false, false, true
        ));
    }

    private boolean value(Boolean update, boolean current) {
        return update == null ? current : update;
    }

    private String enumValue(String update, String current, Set<String> allowed, String label) {
        if (update == null) return current;
        String normalized = update.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(normalized)) throw new IllegalArgumentException("Invalid " + label);
        return normalized;
    }

    private String accentValue(String update, String current) {
        if (update == null) return current;
        String normalized = update.trim().toLowerCase(Locale.ROOT);
        if (!normalized.matches("#[0-9a-f]{6}")) throw new IllegalArgumentException("Accent color must be a six-digit hex color");
        return normalized;
    }

    private String timeValue(String update, String current) {
        if (update == null) return current;
        String normalized = update.trim();
        if (normalized.isEmpty()) return null;
        if (!normalized.matches("(?:[01]\\d|2[0-3]):[0-5]\\d")) throw new IllegalArgumentException("Time must use HH:mm format");
        return normalized;
    }

    private String normalizeEmail(String email) {
        if (email == null) throw new IllegalArgumentException("Authenticated email is required");
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) throw new IllegalArgumentException("Authenticated email is required");
        return normalized;
    }
}
