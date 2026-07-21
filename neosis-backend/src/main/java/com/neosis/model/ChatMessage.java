package com.neosis.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Locale;

@Document(collection = "messages")
@CompoundIndexes({
    @CompoundIndex(name = "conversation_created_idx", def = "{ 'senderEmail': 1, 'recipientEmail': 1, 'createdAt': -1 }"),
    @CompoundIndex(name = "unread_recipient_sender_idx", def = "{ 'recipientEmail': 1, 'readAt': 1, 'senderEmail': 1 }")
})
public class ChatMessage {

    @Id
    private String id;

    private String senderEmail;
    private String recipientEmail;
    private String content;
    private String timestamp;
    private String messageType = "TEXT";
    private String mediaData;
    private String mediaFilename;
    private String mediaContentType;
    private Long mediaSize;
    private LocalDateTime readAt;

    @CreatedDate
    private LocalDateTime createdAt;

    @Transient
    private String localId;

    public ChatMessage() {}

    public ChatMessage(String senderEmail, String recipientEmail, String content, String timestamp) {
        setSenderEmail(senderEmail);
        setRecipientEmail(recipientEmail);
        this.content = content;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = normalize(senderEmail); }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = normalize(recipientEmail); }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }

    public String getMediaData() { return mediaData; }
    public void setMediaData(String mediaData) { this.mediaData = mediaData; }

    public String getMediaFilename() { return mediaFilename; }
    public void setMediaFilename(String mediaFilename) { this.mediaFilename = mediaFilename; }

    public String getMediaContentType() { return mediaContentType; }
    public void setMediaContentType(String mediaContentType) { this.mediaContentType = mediaContentType; }

    public Long getMediaSize() { return mediaSize; }
    public void setMediaSize(Long mediaSize) { this.mediaSize = mediaSize; }

    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getLocalId() { return localId; }
    public void setLocalId(String localId) { this.localId = localId; }

    private String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
