package com.neosis.repository;

import com.neosis.model.BlockedUser;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface BlockedUserRepository extends MongoRepository<BlockedUser, String> {
    boolean existsByBlockerEmailAndBlockedEmail(String blockerEmail, String blockedEmail);
    List<BlockedUser> findByBlockerEmailOrderByCreatedAtDesc(String blockerEmail);
    List<BlockedUser> findByBlockerEmailAndBlockedEmailIn(String blockerEmail, Collection<String> blockedEmails);
    List<BlockedUser> findByBlockedEmailAndBlockerEmailIn(String blockedEmail, Collection<String> blockerEmails);
    long deleteByBlockerEmailAndBlockedEmail(String blockerEmail, String blockedEmail);
    void deleteByBlockerEmailOrBlockedEmail(String blockerEmail, String blockedEmail);
}
