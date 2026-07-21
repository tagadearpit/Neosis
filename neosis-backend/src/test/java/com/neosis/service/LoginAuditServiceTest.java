package com.neosis.service;

import com.neosis.model.LoginEvent;
import com.neosis.repository.LoginEventRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LoginAuditServiceTest {

    @Test
    void recordsMinimalMaskedDeviceMetadata() {
        LoginEventRepository repository = mock(LoginEventRepository.class);
        UserSettingsService settingsService = mock(UserSettingsService.class);
        com.neosis.model.UserSettings settings = new com.neosis.model.UserSettings("owner@example.com");
        when(settingsService.getOrCreate("owner@example.com")).thenReturn(settings);
        LoginAuditService service = new LoginAuditService(repository, settingsService);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("User-Agent", "Mozilla/5.0 (Linux; Android 15) AppleWebKit Chrome/140.0");
        request.setRemoteAddr("203.0.113.42");
        MockHttpSession session = new MockHttpSession();

        service.recordSuccessfulLogin("owner@example.com", request, session);

        ArgumentCaptor<LoginEvent> event = ArgumentCaptor.forClass(LoginEvent.class);
        verify(repository).save(event.capture());
        assertEquals("Android device", event.getValue().getDevice());
        assertEquals("Chrome", event.getValue().getBrowser());
        assertEquals("203.0.113.x", event.getValue().getMaskedIp());
        assertNotNull(event.getValue().getExpiresAt());
        assertEquals("Android device", session.getAttribute(LoginAuditService.DEVICE_ATTRIBUTE));
        assertEquals(true, session.getAttribute(LoginAuditService.NEW_DEVICE_ATTRIBUTE));
    }
}
