package com.neosis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Locale;

@Document(collection = "blocked_users")
@CompoundIndex(name = "blocker_blocked_unique_idx", def = "{ 'blockerEmail': 1, 'blockedEmail': 1 }", unique = true)
public class BlockedUser {

    @Id
    private String id;
    private String blockerEmail;
    private String blockedEmail;
    private LocalDateTime createdAt;

    public BlockedUser() {}

    public BlockedUser(String blockerEmail, String blockedEmail) {
        setBlockerEmail(blockerEmail);
        setBlockedEmail(blockedEmail);
        createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getBlockerEmail() { return blockerEmail; }
    public void setBlockerEmail(String blockerEmail) { this.blockerEmail = normalize(blockerEmail); }
    public String getBlockedEmail() { return blockedEmail; }
    public void setBlockedEmail(String blockedEmail) { this.blockedEmail = normalize(blockedEmail); }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    private String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
