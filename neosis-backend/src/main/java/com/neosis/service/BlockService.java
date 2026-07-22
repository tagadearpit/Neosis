package com.neosis.service;

import com.neosis.model.BlockedUser;
import com.neosis.repository.BlockedUserRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.HashSet;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BlockService {

    private final BlockedUserRepository blockedUserRepository;

    public BlockService(BlockedUserRepository blockedUserRepository) {
        this.blockedUserRepository = blockedUserRepository;
    }

    public boolean isEitherBlocked(String firstEmail, String secondEmail) {
        String first = normalize(firstEmail);
        String second = normalize(secondEmail);
        return first == null || second == null
            || blockedUserRepository.existsByBlockerEmailAndBlockedEmail(first, second)
            || blockedUserRepository.existsByBlockerEmailAndBlockedEmail(second, first);
    }

    public BlockedUser block(String blockerEmail, String blockedEmail) {
        String blocker = normalize(blockerEmail);
        String blocked = normalize(blockedEmail);
        if (blocker == null || blocked == null || blocker.equals(blocked)) {
            throw new IllegalArgumentException("Invalid user to block");
        }
        try {
            return blockedUserRepository.save(new BlockedUser(blocker, blocked));
        } catch (DuplicateKeyException ignored) {
            return blockedUserRepository.findByBlockerEmailOrderByCreatedAtDesc(blocker).stream()
                .filter(entry -> blocked.equals(entry.getBlockedEmail()))
                .findFirst()
                .orElseThrow();
        }
    }

    public Set<String> blockedContacts(String ownerEmail, Collection<String> candidateEmails) {
        String owner = normalize(ownerEmail);
        if (candidateEmails == null || candidateEmails.isEmpty()) return Set.of();
        Set<String> candidates = candidateEmails.stream()
            .map(this::normalize)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        if (owner == null) return candidates;
        if (candidates.isEmpty()) return Set.of();

        Set<String> blocked = new HashSet<>();
        blockedUserRepository.findByBlockerEmailAndBlockedEmailIn(owner, candidates)
            .forEach(entry -> blocked.add(entry.getBlockedEmail()));
        blockedUserRepository.findByBlockedEmailAndBlockerEmailIn(owner, candidates)
            .forEach(entry -> blocked.add(entry.getBlockerEmail()));
        return Set.copyOf(blocked);
    }

    public boolean unblock(String blockerEmail, String blockedEmail) {
        return blockedUserRepository.deleteByBlockerEmailAndBlockedEmail(normalize(blockerEmail), normalize(blockedEmail)) > 0;
    }

    private String normalize(String email) {
        if (email == null) return null;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
