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
    private ChatMessageRepository chatMessageRepository; // NEW: Repository to save messages

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

        // --- LAYER 2: XSS SANITIZATION ---
        String safeContent = chatMessage.getContent();
        chatMessage.setContent(safeContent);
        // -----------------------------------------------------------

        // --- LAYER 3: DATABASE PERSISTENCE ---
        // Save the clean, verified message to PostgreSQL before sending
        chatMessageRepository.save(chatMessage);
        // -----------------------------------------------------------

        // Route the message to the recipient
        messagingTemplate.convertAndSend("/queue/messages/" + chatMessage.getRecipientEmail(), chatMessage);
    }

    // --- TYPING INDICATOR ENDPOINT ---
    @MessageMapping("/chat.typing")
    public void sendTypingIndicator(@Payload Map<String, String> payload, OAuth2AuthenticationToken token) {
        if (token == null) return; // Basic security check
        
        String recipientEmail = payload.get("recipientEmail");
        
        // Forward the typing status directly to the recipient's specific typing queue
        messagingTemplate.convertAndSend("/queue/typing/" + recipientEmail, payload);
    }
}
