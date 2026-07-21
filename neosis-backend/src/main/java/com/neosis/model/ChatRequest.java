package com.neosis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Document(collection = "chat_requests")
@CompoundIndexes({
    @CompoundIndex(name = "unique_pair_idx", def = "{ 'pairKey': 1 }", unique = true),
    @CompoundIndex(name = "sender_status_idx", def = "{ 'senderEmail': 1, 'status': 1 }"),
    @CompoundIndex(name = "receiver_status_idx", def = "{ 'receiverEmail': 1, 'status': 1 }")
})
public class ChatRequest {

    @Id
    private String id;

    private String senderEmail;
    private String receiverEmail;
    private String status;

    private String pairKey;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ChatRequest() {}

    public ChatRequest(String senderEmail, String receiverEmail, String status) {
        setSenderEmail(senderEmail);
        setReceiverEmail(receiverEmail);
        this.status = status;
        this.pairKey = buildPairKey(this.senderEmail, this.receiverEmail);
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public static String buildPairKey(String a, String b) {
        return Stream.of(normalize(a), normalize(b)).sorted().collect(Collectors.joining("#"));
    }

    private static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = normalize(senderEmail); refreshPairKey(); }

    public String getReceiverEmail() { return receiverEmail; }
    public void setReceiverEmail(String receiverEmail) { this.receiverEmail = normalize(receiverEmail); refreshPairKey(); }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; this.updatedAt = LocalDateTime.now(); }

    public String getPairKey() { return pairKey; }
    public void setPairKey(String pairKey) { this.pairKey = pairKey; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    private void refreshPairKey() {
        if (senderEmail != null && receiverEmail != null) {
            this.pairKey = buildPairKey(senderEmail, receiverEmail);
        }
    }
}
