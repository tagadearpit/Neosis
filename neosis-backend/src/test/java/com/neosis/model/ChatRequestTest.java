package com.neosis.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ChatRequestTest {

    @Test
    void buildsStableNormalizedPairKey() {
        ChatRequest request = new ChatRequest(" Second@Example.com ", "first@example.com", "PENDING");

        assertEquals("first@example.com#second@example.com", request.getPairKey());
        assertEquals("second@example.com", request.getSenderEmail());
        assertEquals("first@example.com", request.getReceiverEmail());
        assertNotNull(request.getCreatedAt());
        assertNotNull(request.getUpdatedAt());
    }
}
