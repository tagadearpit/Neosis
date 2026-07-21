package com.neosis.service;

import com.neosis.model.BlockedUser;
import com.neosis.repository.BlockedUserRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BlockServiceTest {

    @Test
    void checksBothDirectionsAndFailsClosedForMissingIdentity() {
        BlockedUserRepository repository = mock(BlockedUserRepository.class);
        BlockService service = new BlockService(repository);
        when(repository.existsByBlockerEmailAndBlockedEmail("first@example.com", "second@example.com")).thenReturn(true);

        assertTrue(service.isEitherBlocked(" FIRST@example.com ", "second@example.com"));
        assertTrue(service.isEitherBlocked(null, "second@example.com"));
    }

    @Test
    void batchesBlockChecksForConversationLists() {
        BlockedUserRepository repository = mock(BlockedUserRepository.class);
        BlockService service = new BlockService(repository);
        when(repository.findByBlockerEmailAndBlockedEmailIn(
            "owner@example.com", Set.of("first@example.com", "second@example.com")
        )).thenReturn(List.of(new BlockedUser("owner@example.com", "first@example.com")));
        when(repository.findByBlockedEmailAndBlockerEmailIn(
            "owner@example.com", Set.of("first@example.com", "second@example.com")
        )).thenReturn(List.of(new BlockedUser("second@example.com", "owner@example.com")));

        assertEquals(
            Set.of("first@example.com", "second@example.com"),
            service.blockedContacts("owner@example.com", Set.of("first@example.com", "second@example.com"))
        );
    }
}
