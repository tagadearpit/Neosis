package com.neosis.config;

import com.neosis.model.User;
import com.neosis.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TermsAcceptedFilterTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void rejectsApplicationApiBeforeTermsAcceptance() throws Exception {
        UserRepository repository = mock(UserRepository.class);
        User user = new User();
        user.setEmail("user@example.com");
        when(repository.findByEmail("user@example.com")).thenReturn(user);
        authenticate();

        TermsAcceptedFilter filter = new TermsAcceptedFilter(repository);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/conversations");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean continued = new AtomicBoolean();

        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> continued.set(true));

        assertEquals(403, response.getStatus());
        assertFalse(continued.get());
    }

    @Test
    void allowsAndCachesAcceptedTerms() throws Exception {
        UserRepository repository = mock(UserRepository.class);
        User user = new User();
        user.setEmail("user@example.com");
        user.setTermsAccepted(true);
        when(repository.findByEmail("user@example.com")).thenReturn(user);
        authenticate();

        TermsAcceptedFilter filter = new TermsAcceptedFilter(repository);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/conversations");
        request.getSession(true);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean continued = new AtomicBoolean();

        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> continued.set(true));

        assertTrue(continued.get());
        assertEquals(Boolean.TRUE, request.getSession().getAttribute(TermsAcceptedFilter.SESSION_ATTRIBUTE));
    }

    private void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("user@example.com", "n/a", List.of())
        );
    }
}
