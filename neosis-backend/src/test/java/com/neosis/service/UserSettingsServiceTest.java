package com.neosis.service;

import com.neosis.dto.UpdateUserSettingsRequest;
import com.neosis.model.UserSettings;
import com.neosis.repository.UserRepository;
import com.neosis.repository.UserSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserSettingsServiceTest {

    @Mock UserSettingsRepository settingsRepository;
    @Mock UserRepository userRepository;

    private UserSettingsService service;

    @BeforeEach
    void setUp() {
        service = new UserSettingsService(settingsRepository, userRepository);
    }

    @Test
    void highPrivacyModeAppliesTheDocumentedPrivacyProfile() {
        UserSettings settings = new UserSettings("owner@example.com");
        when(settingsRepository.findByOwnerEmail("owner@example.com")).thenReturn(Optional.of(settings));
        when(settingsRepository.save(any(UserSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateUserSettingsRequest.Security security = new UpdateUserSettingsRequest.Security(true, true);
        UserSettings updated = service.update(
            "owner@example.com",
            new UpdateUserSettingsRequest(null, null, null, null, security)
        );

        assertTrue(updated.getSecurity().highPrivacyMode());
        assertEquals("NOBODY", updated.getPrivacy().lastSeen());
        assertFalse(updated.getPrivacy().readReceipts());
        assertFalse(updated.getPrivacy().typingIndicators());
        assertEquals("HIDDEN", updated.getNotifications().preview());
        assertFalse(updated.getMedia().linkPreviews());
        assertTrue(updated.getMedia().blockUnknownAttachments());
    }
}
