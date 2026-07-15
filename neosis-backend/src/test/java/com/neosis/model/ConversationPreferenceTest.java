package com.neosis.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ConversationPreferenceTest {

    @Test
    void normalizesConversationIdentity() {
        ConversationPreference preference = new ConversationPreference(" Owner@Example.com ", "Contact@Example.com");

        assertEquals("owner@example.com", preference.getOwnerEmail());
        assertEquals("contact@example.com", preference.getContactEmail());
        assertNotNull(preference.getCreatedAt());
        assertNotNull(preference.getUpdatedAt());
    }
}
