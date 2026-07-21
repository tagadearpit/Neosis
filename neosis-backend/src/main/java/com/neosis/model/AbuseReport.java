package com.neosis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "abuse_reports")
@CompoundIndex(name = "reported_status_created_idx", def = "{ 'reportedEmail': 1, 'status': 1, 'createdAt': -1 }")
public class AbuseReport {

    @Id
    private String id;
    private String reporterEmail;
    private String reportedEmail;
    private String messageId;
    private LocalDateTime messageCreatedAt;
    private String category;
    private String details;
    private String status = "OPEN";
    private LocalDateTime createdAt;

    public AbuseReport() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getReporterEmail() { return reporterEmail; }
    public void setReporterEmail(String reporterEmail) { this.reporterEmail = reporterEmail; }
    public String getReportedEmail() { return reportedEmail; }
    public void setReportedEmail(String reportedEmail) { this.reportedEmail = reportedEmail; }
    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }
    public LocalDateTime getMessageCreatedAt() { return messageCreatedAt; }
    public void setMessageCreatedAt(LocalDateTime messageCreatedAt) { this.messageCreatedAt = messageCreatedAt; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
