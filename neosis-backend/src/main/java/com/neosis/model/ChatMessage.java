package com.neosis.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
public class ChatMessage {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; 
    
    private String senderEmail;
    private String recipientEmail;

    @Column(columnDefinition = "TEXT")
    private String content;
    
    private String timestamp; 

    // FIX: Added fields for Rich Media attachments (Voice Notes, Images)
    private String messageType = "TEXT"; 
    
    @Column(columnDefinition = "TEXT")
    private String mediaData;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Transient
    private String localId;

    public ChatMessage() {}

    public ChatMessage(String senderEmail, String recipientEmail, String content, String timestamp) {
        this.senderEmail = senderEmail;
        this.recipientEmail = recipientEmail;
        this.content = content;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = senderEmail; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    
    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }

    public String getMediaData() { return mediaData; }
    public void setMediaData(String mediaData) { this.mediaData = mediaData; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getLocalId() { return localId; }
    public void setLocalId(String localId) { this.localId = localId; }
}