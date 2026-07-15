package com.neosis.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserTest {

    @Test
    void appliesSafeDefaultsForLegacyDocuments() {
        User user = new User();
        user.setEmail(" User@Example.com ");

        assertEquals("user@example.com", user.getEmail());
        assertEquals("Available on Neosis", user.getStatusMessage());
        assertTrue(user.isNotificationSoundsEnabled());
        assertTrue(user.isTypingIndicatorsEnabled());
    }
}
