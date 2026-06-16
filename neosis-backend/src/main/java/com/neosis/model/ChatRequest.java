package com.neosis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "chat_requests")
public class ChatRequest {
    
    @Id
    private String id; // CRITICAL FIX: MongoDB uses String ObjectIDs
    
    private String senderEmail;
    private String receiverEmail;
    private String status; // Will be "PENDING" or "ACCEPTED"

    public ChatRequest() {}

    public ChatRequest(String senderEmail, String receiverEmail, String status) {
        this.senderEmail = senderEmail;
        this.receiverEmail = receiverEmail;
        this.status = status;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = senderEmail; }

    public String getReceiverEmail() { return receiverEmail; }
    public void setReceiverEmail(String receiverEmail) { this.receiverEmail = receiverEmail; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}