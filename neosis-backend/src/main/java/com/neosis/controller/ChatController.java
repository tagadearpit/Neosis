package com.neosis.controller;

import com.neosis.model.ChatMessage;
import com.neosis.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController // CRITICAL FIX: Changed from @Controller to support REST HTTP Uploads
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private MongoTemplate mongoTemplate; 

    // ==========================================
    // NEW: Native MongoDB Binary Storage Schema
    // ==========================================
    @Document(collection = "media_files")
    public static class MediaFile {
        @Id
        public String id;
        public String contentType;
        public byte[] data;
    }

    // ==========================================
    // NEW: HTTP Endpoint to Upload Files 
    // ==========================================
    @PostMapping("/api/chat/upload")
    public ResponseEntity<?> uploadMedia(@RequestParam("file") MultipartFile file, OAuth2AuthenticationToken token) {
        if (token == null) return ResponseEntity.status(401).body("Unauthorized");
        
        try {
            MediaFile media = new MediaFile();
            media.id = UUID.randomUUID().toString();
            media.contentType = file.getContentType();
            media.data = file.getBytes(); // Store as pure binary, no Base64 bloat
            
            mongoTemplate.save(media);
            
            // Return the URL endpoint that serves this file to the React frontend
            String fileUrl = "/api/chat/media/" + media.id;
            return ResponseEntity.ok(Map.of("url", fileUrl));
        } catch (IOException e) {
            return ResponseEntity.status(500).body("File upload failed");
        }
    }

    // ==========================================
    // NEW: HTTP Endpoint to Serve Files to UI
    // ==========================================
    @GetMapping("/api/chat/media/{id}")
    public ResponseEntity<byte[]> getMedia(@PathVariable String id) {
        MediaFile media = mongoTemplate.findById(id, MediaFile.class);
        if (media == null) return ResponseEntity.notFound().build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(media.contentType));
        // Adds cache-control so the browser doesn't re-download images repeatedly
        headers.setCacheControl("max-age=31536000"); 
        
        return new ResponseEntity<>(media.data, headers, HttpStatus.OK);
    }

    // ==========================================
    // EXISTING: STOMP WebSocket Endpoints
    // ==========================================
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage chatMessage, OAuth2AuthenticationToken token) {
        if (token == null) return; 

        Map<String, Object> attributes = token.getPrincipal().getAttributes();
        String trueEmail = (String) attributes.get("email");

        if (!trueEmail.equalsIgnoreCase(chatMessage.getSenderEmail())) {
            System.out.println("SECURITY ALERT: Spoofing attempt blocked from: " + trueEmail);
            return; 
        }

        // Save to DB to generate the official ID
        ChatMessage savedMessage = chatMessageRepository.save(chatMessage);

        // Broadcast to RECIPIENT
        messagingTemplate.convertAndSend("/queue/messages/" + savedMessage.getRecipientEmail(), savedMessage);
        
        // Broadcast back to SENDER (so frontend clears "pending" checkmarks)
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
