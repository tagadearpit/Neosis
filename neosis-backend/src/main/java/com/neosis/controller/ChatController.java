package com.neosis.controller;

import com.mongodb.client.gridfs.model.GridFSFile;
import com.neosis.model.ChatMessage;
import com.neosis.model.ChatRequest;
import com.neosis.repository.ChatMessageRepository;
import com.neosis.repository.ChatRequestRepository;
import com.neosis.repository.UserRepository;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@RestController
public class ChatController {

    private static final long MAX_UPLOAD_BYTES = 15L * 1024L * 1024L;
    private static final int MAX_MESSAGE_CHARS = 5_000;
    private static final Set<String> ALLOWED_MESSAGE_TYPES = Set.of("TEXT", "IMAGE", "VIDEO", "AUDIO", "DOCUMENT");
    private static final Set<String> ALLOWED_DOCUMENT_TYPES = Set.of(
        "application/pdf",
        "text/plain",
        "text/csv",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private ChatRequestRepository requestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GridFsTemplate gridFsTemplate;

    @PostMapping("/api/chat/upload")
    public ResponseEntity<?> uploadMedia(
        @RequestParam("file") MultipartFile file,
        @RequestParam("recipientEmail") String recipientEmail,
        OAuth2AuthenticationToken token
    ) {
        String senderEmail = authenticatedEmail(token);
        String recipient = normalizeEmail(recipientEmail);

        if (senderEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        if (recipient == null || !userRepository.existsByEmailIgnoreCase(recipient)) return ResponseEntity.badRequest().body(Map.of("error", "Recipient does not exist"));
        if (!areAcceptedContacts(senderEmail, recipient)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "You can only upload files for accepted contacts"));
        if (file == null || file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        if (file.getSize() > MAX_UPLOAD_BYTES) return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of("error", "Maximum file size is 15MB"));

        String contentType = sanitizeContentType(file.getContentType(), file.getOriginalFilename());
        if (!isAllowedContentType(contentType)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported file type"));
        }

        String publicId = UUID.randomUUID().toString();
        String safeFilename = safeFilename(file.getOriginalFilename(), publicId);

        Document metadata = new Document();
        metadata.put("publicId", publicId);
        metadata.put("senderEmail", senderEmail);
        metadata.put("recipientEmail", recipient);
        metadata.put("originalFilename", safeFilename);
        metadata.put("contentType", contentType);
        metadata.put("size", file.getSize());
        metadata.put("createdAt", LocalDateTime.now().toString());

        try {
            gridFsTemplate.store(file.getInputStream(), safeFilename, contentType, metadata);
            return ResponseEntity.ok(Map.of(
                "id", publicId,
                "url", "/api/chat/media/" + publicId,
                "filename", safeFilename,
                "contentType", contentType,
                "size", file.getSize()
            ));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "File upload failed"));
        }
    }

    @GetMapping("/api/chat/media/{id}")
    public ResponseEntity<?> getMedia(@PathVariable String id, OAuth2AuthenticationToken token) {
        String currentUserEmail = authenticatedEmail(token);
        if (currentUserEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");

        GridFSFile file = findMediaByPublicId(id);
        if (file == null) return ResponseEntity.notFound().build();

        Document metadata = file.getMetadata();
        if (metadata == null) return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Missing media metadata");

        String senderEmail = normalizeEmail(metadata.getString("senderEmail"));
        String recipientEmail = normalizeEmail(metadata.getString("recipientEmail"));
        if (!currentUserEmail.equals(senderEmail) && !currentUserEmail.equals(recipientEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }

        GridFsResource resource = gridFsTemplate.getResource(file);
        String filename = safeFilename(metadata.getString("originalFilename"), id);
        String contentType = sanitizeContentType(metadata.getString("contentType"), filename);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(parseMediaType(contentType));
        headers.setContentLength(file.getLength());
        headers.setCacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePrivate());

        ContentDisposition disposition = isPreviewable(contentType)
            ? ContentDisposition.inline().filename(filename).build()
            : ContentDisposition.attachment().filename(filename).build();
        headers.setContentDisposition(disposition);

        try {
            return new ResponseEntity<>(new InputStreamResource(resource.getInputStream()), headers, HttpStatus.OK);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not read media");
        }
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage chatMessage, Principal principal) {
        String trueEmail = principalEmail(principal);
        if (trueEmail == null || chatMessage == null) return;

        String recipientEmail = normalizeEmail(chatMessage.getRecipientEmail());
        if (recipientEmail == null || !userRepository.existsByEmailIgnoreCase(recipientEmail)) return;
        if (!areAcceptedContacts(trueEmail, recipientEmail)) return;

        String type = normalizeMessageType(chatMessage.getMessageType());
        String content = chatMessage.getContent() == null ? "" : chatMessage.getContent().trim();
        if (content.length() > MAX_MESSAGE_CHARS) return;
        if ("TEXT".equals(type) && content.isBlank()) return;
        if (!"TEXT".equals(type) && chatMessage.getMediaData() == null) return;

        chatMessage.setSenderEmail(trueEmail);
        chatMessage.setRecipientEmail(recipientEmail);
        chatMessage.setMessageType(type);
        chatMessage.setContent(content);
        chatMessage.setCreatedAt(LocalDateTime.now());

        if (!"TEXT".equals(type)) {
            GridFSFile media = findMediaByPublicId(extractMediaId(chatMessage.getMediaData()));
            if (!isMediaOwnedByConversation(media, trueEmail, recipientEmail)) return;

            Document metadata = media.getMetadata();
            chatMessage.setMediaData("/api/chat/media/" + metadata.getString("publicId"));
            chatMessage.setMediaFilename(metadata.getString("originalFilename"));
            chatMessage.setMediaContentType(metadata.getString("contentType"));
            chatMessage.setMediaSize(media.getLength());
        } else {
            chatMessage.setMediaData(null);
            chatMessage.setMediaFilename(null);
            chatMessage.setMediaContentType(null);
            chatMessage.setMediaSize(null);
        }

        ChatMessage savedMessage = chatMessageRepository.save(chatMessage);
        messagingTemplate.convertAndSendToUser(savedMessage.getRecipientEmail(), "/queue/messages", savedMessage);
        messagingTemplate.convertAndSendToUser(savedMessage.getSenderEmail(), "/queue/messages", savedMessage);
    }

    @MessageMapping("/chat.typing")
    public void sendTypingIndicator(@Payload Map<String, String> payload, Principal principal) {
        String senderEmail = principalEmail(principal);
        if (senderEmail == null || payload == null) return;

        String recipientEmail = normalizeEmail(payload.get("recipientEmail"));
        if (recipientEmail == null || !areAcceptedContacts(senderEmail, recipientEmail)) return;

        Map<String, String> safePayload = Map.of(
            "senderEmail", senderEmail,
            "recipientEmail", recipientEmail,
            "isTyping", "true".equals(payload.get("isTyping")) ? "true" : "false"
        );
        messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/typing", safePayload);
    }

    @MessageMapping("/chat.signal")
    public void processWebRTCSignal(@Payload Map<String, Object> payload, Principal principal) {
        String senderEmail = principalEmail(principal);
        if (senderEmail == null || payload == null) return;

        String recipientEmail = normalizeEmail((String) payload.get("recipientEmail"));
        String type = payload.get("type") == null ? null : payload.get("type").toString();
        if (recipientEmail == null || !areAcceptedContacts(senderEmail, recipientEmail)) return;
        if (!Set.of("offer", "answer", "ice-candidate", "end-call", "call-rejected").contains(type)) return;

        payload.put("senderEmail", senderEmail);
        payload.put("recipientEmail", recipientEmail);
        messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/signaling", payload);
    }

    private boolean areAcceptedContacts(String user1, String user2) {
        if (user1 == null || user2 == null || user1.equalsIgnoreCase(user2)) return false;
        return !requestRepository.findAcceptedBetween(normalizeEmail(user1), normalizeEmail(user2)).isEmpty();
    }

    private boolean isMediaOwnedByConversation(GridFSFile file, String senderEmail, String recipientEmail) {
        if (file == null || file.getMetadata() == null) return false;
        Document metadata = file.getMetadata();
        return senderEmail.equals(normalizeEmail(metadata.getString("senderEmail")))
            && recipientEmail.equals(normalizeEmail(metadata.getString("recipientEmail")));
    }

    private GridFSFile findMediaByPublicId(String id) {
        if (id == null || id.isBlank()) return null;
        return gridFsTemplate.findOne(new Query(Criteria.where("metadata.publicId").is(id)));
    }

    private String extractMediaId(String mediaData) {
        if (mediaData == null) return null;
        int slash = mediaData.lastIndexOf('/');
        return slash >= 0 ? mediaData.substring(slash + 1) : mediaData;
    }

    private String normalizeMessageType(String type) {
        String normalized = type == null ? "TEXT" : type.trim().toUpperCase(Locale.ROOT);
        return ALLOWED_MESSAGE_TYPES.contains(normalized) ? normalized : "TEXT";
    }

    private String authenticatedEmail(OAuth2AuthenticationToken token) {
        if (token == null || token.getPrincipal() == null) return null;
        Object email = token.getPrincipal().getAttributes().get("email");
        return normalizeEmail(email == null ? token.getName() : email.toString());
    }

    private String principalEmail(Principal principal) {
        return principal == null ? null : normalizeEmail(principal.getName());
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }

    private String sanitizeContentType(String contentType, String filename) {
        String normalized = contentType == null ? "" : contentType.trim().toLowerCase(Locale.ROOT);
        if (normalized.contains(";")) normalized = normalized.substring(0, normalized.indexOf(';')).trim();
        if (!normalized.isBlank()) return normalized;

        String lowerName = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (lowerName.endsWith(".pdf")) return "application/pdf";
        if (lowerName.endsWith(".txt")) return "text/plain";
        if (lowerName.endsWith(".csv")) return "text/csv";
        if (lowerName.endsWith(".doc")) return "application/msword";
        if (lowerName.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (lowerName.endsWith(".xls")) return "application/vnd.ms-excel";
        if (lowerName.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (lowerName.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
        if (lowerName.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        return MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }

    private boolean isAllowedContentType(String contentType) {
        if (contentType == null) return false;
        return contentType.startsWith("image/")
            || contentType.startsWith("video/")
            || contentType.startsWith("audio/")
            || ALLOWED_DOCUMENT_TYPES.contains(contentType);
    }

    private boolean isPreviewable(String contentType) {
        return contentType != null && (contentType.startsWith("image/") || contentType.startsWith("video/") || contentType.startsWith("audio/"));
    }

    private MediaType parseMediaType(String contentType) {
        try {
            return MediaType.parseMediaType(contentType);
        } catch (Exception ignored) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private String safeFilename(String originalFilename, String fallback) {
        String cleaned = originalFilename == null ? "" : originalFilename.replaceAll("[\\r\\n\\t\\x00]", "").replaceAll("[\\\\/]+", "_").trim();
        if (cleaned.isBlank()) return "neosis-file-" + fallback;
        if (cleaned.length() > 160) return cleaned.substring(cleaned.length() - 160);
        return cleaned;
    }
}
