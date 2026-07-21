package com.neosis.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;

class ConversationPreferenceTest {

    @Test
    void normalizesConversationIdentity() {
        ConversationPreference preference = new ConversationPreference(" Owner@Example.com ", "Contact@Example.com");

        assertEquals("owner@example.com", preference.getOwnerEmail());
        assertEquals("contact@example.com", preference.getContactEmail());
        assertNotNull(preference.getCreatedAt());
        assertNotNull(preference.getUpdatedAt());
    }

    @Test
    void expiresTimedMuteWithoutChangingStoredPreference() {
        ConversationPreference preference = new ConversationPreference("owner@example.com", "contact@example.com");
        preference.setMuted(true);
        preference.setMutedUntil(LocalDateTime.now().plusMinutes(15));
        preference.setDisappearingMessagesSeconds(86_400);

        assertTrue(preference.isMuted());
        assertEquals(86_400, preference.getDisappearingMessagesSeconds());

        preference.setMutedUntil(LocalDateTime.now().minusSeconds(1));
        assertFalse(preference.isMuted());
    }
}
