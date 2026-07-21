package com.neosis.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserSettingsTest {

    @Test
    void createsPrivacyRespectingDefaults() {
        UserSettings settings = new UserSettings(" Owner@Example.com ");

        assertEquals("owner@example.com", settings.getOwnerEmail());
        assertEquals("CONTACTS", settings.getPrivacy().lastSeen());
        assertTrue(settings.getPrivacy().readReceipts());
        assertEquals("SYSTEM", settings.getAppearance().theme());
        assertTrue(settings.getMedia().blockUnknownAttachments());
        assertFalse(settings.getSecurity().highPrivacyMode());
    }

    @Test
    void returnsDefaultsForOlderDocumentsWithMissingSections() {
        UserSettings settings = new UserSettings();
        settings.setPrivacy(null);
        settings.setNotifications(null);

        assertTrue(settings.getPrivacy().typingIndicators());
        assertEquals("FULL", settings.getNotifications().preview());
    }
}
