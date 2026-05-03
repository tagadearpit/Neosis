package com.neosis.controller;

import com.neosis.model.ChatMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Controller;
import org.springframework.web.util.HtmlUtils;

import java.util.Map;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage chatMessage, OAuth2AuthenticationToken token) {
        
        // --- LAYER 1: IDENTITY VERIFICATION ---
        if (token == null) return; 

        Map<String, Object> attributes = token.getPrincipal().getAttributes();
        String trueEmail = (String) attributes.get("email");

        if (!trueEmail.equalsIgnoreCase(chatMessage.getSenderEmail())) {
            System.out.println("SECURITY ALERT: Spoofing attempt blocked from: " + trueEmail);
            return; 
        }

        // --- LAYER 2: XSS SANITIZATION (Replaces SQLi concerns) ---
        // This converts <script> tags into harmless text (&lt;script&gt;)
        // so hackers cannot inject malicious code into the chat window!
        String safeContent = HtmlUtils.htmlEscape(chatMessage.getContent());
        chatMessage.setContent(safeContent);
        // -----------------------------------------------------------

        // Route the clean, verified message to the recipient
        messagingTemplate.convertAndSend("/queue/messages/" + chatMessage.getRecipientEmail(), chatMessage);
    }
}
