package com.neosis.controller;

import com.neosis.model.ChatMessage;
import com.neosis.repository.ChatMessageRepository;
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

    @Autowired
    private ChatMessageRepository chatMessageRepository;

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

        // --- LAYER 2: XSS SANITIZATION (CRITICAL FIX) ---
        // HtmlUtils.htmlEscape() correctly sanitizes malicious scripts now
        String safeContent = HtmlUtils.htmlEscape(chatMessage.getContent());
        chatMessage.setContent(safeContent);
        // -----------------------------------------------------------

        // --- LAYER 3: DATABASE PERSISTENCE ---
        chatMessageRepository.save(chatMessage);
        // -----------------------------------------------------------

        messagingTemplate.convertAndSend("/queue/messages/" + chatMessage.getRecipientEmail(), chatMessage);
    }

    @MessageMapping("/chat.typing")
    public void sendTypingIndicator(@Payload Map<String, String> payload, OAuth2AuthenticationToken token) {
        if (token == null) return; 
        
        String recipientEmail = payload.get("recipientEmail");
        messagingTemplate.convertAndSend("/queue/typing/" + recipientEmail, payload);
    }
}