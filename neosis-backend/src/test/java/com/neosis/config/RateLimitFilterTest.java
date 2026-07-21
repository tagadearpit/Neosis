package com.neosis.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RateLimitFilterTest {

    @Test
    void limitsUploadsByRemoteIdentity() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();

        for (int requestNumber = 1; requestNumber <= 20; requestNumber++) {
            MockHttpServletResponse response = execute(filter, "POST", "/api/chat/upload");
            assertEquals(200, response.getStatus());
        }

        MockHttpServletResponse rejected = execute(filter, "POST", "/api/chat/upload");
        assertEquals(429, rejected.getStatus());
        assertEquals("20", rejected.getHeader("RateLimit-Limit"));
    }

    @Test
    void groupsVariableConversationPathsIntoOnePolicy() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();

        for (int requestNumber = 0; requestNumber < 30; requestNumber++) {
            MockHttpServletResponse response = execute(filter, "DELETE", "/api/conversations/contact-" + requestNumber);
            assertEquals(200, response.getStatus());
        }

        assertEquals(429, execute(filter, "DELETE", "/api/conversations/another-contact").getStatus());
    }

    private MockHttpServletResponse execute(RateLimitFilter filter, String method, String path) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setRemoteAddr("203.0.113.10");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {});
        return response;
    }
}
