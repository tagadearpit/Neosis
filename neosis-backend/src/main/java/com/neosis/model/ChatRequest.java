package com.neosis.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class ChatRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String senderEmail;
    private String receiverEmail;
    private String status; // Will be "PENDING" or "ACCEPTED"

    public ChatRequest() {}

    public ChatRequest(String senderEmail, String receiverEmail, String status) {
        this.senderEmail = senderEmail;
        this.receiverEmail = receiverEmail;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = senderEmail; }

    public String getReceiverEmail() { return receiverEmail; }
    public void setReceiverEmail(String receiverEmail) { this.receiverEmail = receiverEmail; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
