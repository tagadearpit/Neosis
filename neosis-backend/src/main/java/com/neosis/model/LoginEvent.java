package com.neosis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "login_events")
@CompoundIndex(name = "owner_login_created_idx", def = "{ 'ownerEmail': 1, 'createdAt': -1 }")
public class LoginEvent {

    @Id
    private String id;
    private String ownerEmail;
    private String method;
    private String device;
    private String browser;
    private String maskedIp;
    private boolean successful;
    private LocalDateTime createdAt;

    @Indexed(expireAfter = "0s")
    private LocalDateTime expiresAt;

    public LoginEvent() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getOwnerEmail() { return ownerEmail; }
    public void setOwnerEmail(String ownerEmail) { this.ownerEmail = ownerEmail; }
    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
    public String getDevice() { return device; }
    public void setDevice(String device) { this.device = device; }
    public String getBrowser() { return browser; }
    public void setBrowser(String browser) { this.browser = browser; }
    public String getMaskedIp() { return maskedIp; }
    public void setMaskedIp(String maskedIp) { this.maskedIp = maskedIp; }
    public boolean isSuccessful() { return successful; }
    public void setSuccessful(boolean successful) { this.successful = successful; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}
