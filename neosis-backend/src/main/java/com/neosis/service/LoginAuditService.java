package com.neosis.service;

import com.neosis.model.LoginEvent;
import com.neosis.repository.LoginEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class LoginAuditService {

    public static final String DEVICE_ATTRIBUTE = "neosis.device";
    public static final String BROWSER_ATTRIBUTE = "neosis.browser";
    public static final String IP_ATTRIBUTE = "neosis.maskedIp";
    public static final String NEW_DEVICE_ATTRIBUTE = "neosis.newDeviceLogin";

    private final LoginEventRepository loginEventRepository;
    private final UserSettingsService settingsService;

    public LoginAuditService(LoginEventRepository loginEventRepository, UserSettingsService settingsService) {
        this.loginEventRepository = loginEventRepository;
        this.settingsService = settingsService;
    }

    public void recordSuccessfulLogin(String email, HttpServletRequest request, HttpSession session) {
        String userAgent = request.getHeader("User-Agent");
        String device = deviceName(userAgent);
        String browser = browserName(userAgent);
        String maskedIp = maskIp(request.getRemoteAddr());
        boolean knownDevice = loginEventRepository.existsByOwnerEmailAndDeviceAndBrowserAndMaskedIp(
            email, device, browser, maskedIp
        );

        session.setAttribute(DEVICE_ATTRIBUTE, device);
        session.setAttribute(BROWSER_ATTRIBUTE, browser);
        session.setAttribute(IP_ATTRIBUTE, maskedIp);
        session.setAttribute(
            NEW_DEVICE_ATTRIBUTE,
            !knownDevice && settingsService.getOrCreate(email).getSecurity().notifyNewLogin()
        );

        LoginEvent event = new LoginEvent();
        event.setOwnerEmail(email);
        event.setMethod("GOOGLE_OAUTH");
        event.setDevice(device);
        event.setBrowser(browser);
        event.setMaskedIp(maskedIp);
        event.setSuccessful(true);
        event.setCreatedAt(LocalDateTime.now());
        event.setExpiresAt(LocalDateTime.now().plusDays(180));
        loginEventRepository.save(event);
    }

    private String deviceName(String userAgent) {
        String ua = safe(userAgent).toLowerCase(Locale.ROOT);
        if (ua.contains("android")) return "Android device";
        if (ua.contains("iphone") || ua.contains("ipad")) return "Apple mobile device";
        if (ua.contains("windows")) return "Windows computer";
        if (ua.contains("macintosh") || ua.contains("mac os")) return "Mac computer";
        if (ua.contains("linux")) return "Linux computer";
        return "Unknown device";
    }

    private String browserName(String userAgent) {
        String ua = safe(userAgent).toLowerCase(Locale.ROOT);
        if (ua.contains("edg/")) return "Microsoft Edge";
        if (ua.contains("firefox/")) return "Firefox";
        if (ua.contains("chrome/")) return "Chrome";
        if (ua.contains("safari/")) return "Safari";
        return "Unknown browser";
    }

    private String maskIp(String address) {
        if (address == null || address.isBlank()) return "Unknown";
        if (address.contains(".")) {
            int lastDot = address.lastIndexOf('.');
            return lastDot > 0 ? address.substring(0, lastDot) + ".x" : "Masked";
        }
        if (address.contains(":")) {
            String[] parts = address.split(":");
            return parts.length >= 2 ? parts[0] + ":" + parts[1] + "::/32" : "Masked IPv6";
        }
        return "Masked";
    }

    private String safe(String value) {
        return value == null ? "" : value.substring(0, Math.min(value.length(), 512));
    }
}
