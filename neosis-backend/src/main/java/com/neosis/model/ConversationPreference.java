package com.neosis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Locale;

@Document(collection = "conversation_preferences")
@CompoundIndex(name = "owner_contact_unique_idx", def = "{ 'ownerEmail': 1, 'contactEmail': 1 }", unique = true)
public class ConversationPreference {

    @Id
    private String id;

    private String ownerEmail;
    private String contactEmail;
    private boolean pinned;
    private boolean muted;
    private LocalDateTime mutedUntil;
    private int disappearingMessagesSeconds;
    private LocalDateTime clearedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ConversationPreference() {}

    public ConversationPreference(String ownerEmail, String contactEmail) {
        this.ownerEmail = normalize(ownerEmail);
        this.contactEmail = normalize(contactEmail);
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOwnerEmail() { return ownerEmail; }
    public void setOwnerEmail(String ownerEmail) { this.ownerEmail = normalize(ownerEmail); }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = normalize(contactEmail); }

    public boolean isPinned() { return pinned; }
    public void setPinned(boolean pinned) { this.pinned = pinned; }

    public boolean isMuted() { return muted && (mutedUntil == null || mutedUntil.isAfter(LocalDateTime.now())); }
    public void setMuted(boolean muted) { this.muted = muted; }

    public LocalDateTime getMutedUntil() { return mutedUntil; }
    public void setMutedUntil(LocalDateTime mutedUntil) { this.mutedUntil = mutedUntil; }

    public int getDisappearingMessagesSeconds() { return disappearingMessagesSeconds; }
    public void setDisappearingMessagesSeconds(int disappearingMessagesSeconds) { this.disappearingMessagesSeconds = disappearingMessagesSeconds; }

    public LocalDateTime getClearedAt() { return clearedAt; }
    public void setClearedAt(LocalDateTime clearedAt) { this.clearedAt = clearedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    private static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
