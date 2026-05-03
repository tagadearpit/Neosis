package com.neosis.model;

public class ChatMessage {
    private String senderEmail;
    private String recipientEmail;
    private String content;

    // Default constructor
    public ChatMessage() {}

    public ChatMessage(String senderEmail, String recipientEmail, String content) {
        this.senderEmail = senderEmail;
        this.recipientEmail = recipientEmail;
        this.content = content;
    }

    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = senderEmail; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
