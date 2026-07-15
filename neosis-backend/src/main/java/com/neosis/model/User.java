package com.neosis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Locale;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String name;
    private boolean nameCustomized;
    private String statusMessage;
    private Boolean notificationSoundsEnabled;
    private Boolean typingIndicatorsEnabled;
    private boolean termsAccepted;
    private LocalDateTime termsAcceptedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public User() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) {
        this.email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name == null ? null : name.trim(); }

    public boolean isNameCustomized() { return nameCustomized; }
    public void setNameCustomized(boolean nameCustomized) { this.nameCustomized = nameCustomized; }

    public String getStatusMessage() {
        return statusMessage == null || statusMessage.isBlank() ? "Available on Neosis" : statusMessage;
    }
    public void setStatusMessage(String statusMessage) {
        this.statusMessage = statusMessage == null ? null : statusMessage.trim();
    }

    public boolean isNotificationSoundsEnabled() {
        return notificationSoundsEnabled == null || notificationSoundsEnabled;
    }
    public void setNotificationSoundsEnabled(Boolean notificationSoundsEnabled) {
        this.notificationSoundsEnabled = notificationSoundsEnabled;
    }

    public boolean isTypingIndicatorsEnabled() {
        return typingIndicatorsEnabled == null || typingIndicatorsEnabled;
    }
    public void setTypingIndicatorsEnabled(Boolean typingIndicatorsEnabled) {
        this.typingIndicatorsEnabled = typingIndicatorsEnabled;
    }

    public boolean isTermsAccepted() { return termsAccepted; }
    public void setTermsAccepted(boolean termsAccepted) { this.termsAccepted = termsAccepted; }

    public LocalDateTime getTermsAcceptedAt() { return termsAcceptedAt; }
    public void setTermsAcceptedAt(LocalDateTime termsAcceptedAt) { this.termsAcceptedAt = termsAcceptedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
