package com.neosis.controller;

import com.neosis.model.ChatMessage;
import com.neosis.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage chatMessage, OAuth2AuthenticationToken token) {
        if (token == null) return; 

        Map<String, Object> attributes = token.getPrincipal().getAttributes();
        String trueEmail = (String) attributes.get("email");

        if (!trueEmail.equalsIgnoreCase(chatMessage.getSenderEmail())) {
            System.out.println("SECURITY ALERT: Spoofing attempt blocked from: " + trueEmail);
            return; 
        }

        // FIX: Removed HtmlUtils.htmlEscape() - React natively prevents XSS. Escaping breaks rich text.
        
        // Save to DB to generate the official ID
        ChatMessage savedMessage = chatMessageRepository.save(chatMessage);

        // FIX: Broadcast to RECIPIENT
        messagingTemplate.convertAndSend("/queue/messages/" + savedMessage.getRecipientEmail(), savedMessage);
        
        // FIX: Broadcast back to SENDER (so frontend clears "pending" checkmarks)
        messagingTemplate.convertAndSend("/queue/messages/" + savedMessage.getSenderEmail(), savedMessage);
    }

    @MessageMapping("/chat.typing")
    public void sendTypingIndicator(@Payload Map<String, String> payload, OAuth2AuthenticationToken token) {
        if (token == null) return; 
        
        String recipientEmail = payload.get("recipientEmail");
        messagingTemplate.convertAndSend("/queue/typing/" + recipientEmail, payload);
    }

    @MessageMapping("/chat.signal")
    public void processWebRTCSignal(@Payload Map<String, Object> payload, OAuth2AuthenticationToken token) {
        if (token == null) return; 
        
        String senderEmail = (String) token.getPrincipal().getAttributes().get("email");
        String recipientEmail = (String) payload.get("recipientEmail");

        payload.put("senderEmail", senderEmail);

        messagingTemplate.convertAndSend("/queue/signaling/" + recipientEmail, payload);
    }
}