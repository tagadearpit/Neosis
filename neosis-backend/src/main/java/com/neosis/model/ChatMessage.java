package com.neosis.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "messages")
public class ChatMessage {
    
    @Id
    private String id; // CRITICAL FIX: MongoDB uses String ObjectIDs
    
    private String senderEmail;
    private String recipientEmail;
    private String content;
    private String timestamp; 

    private String messageType = "TEXT"; 
    private String mediaData;

    @CreatedDate
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

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

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