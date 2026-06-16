package com.neosis.controller;

import com.neosis.model.ChatRequest;
import com.neosis.model.User;
import com.neosis.repository.ChatRequestRepository;
import com.neosis.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    @Autowired
    private ChatRequestRepository requestRepository;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping("/request")
    public String sendRequest(@RequestParam String receiverEmail, OAuth2AuthenticationToken token) {
        if (token == null) return "Unauthorized";
        String senderEmail = (String) token.getPrincipal().getAttributes().get("email");
        
        User receiver = userRepository.findByEmail(receiverEmail);
        if (receiver == null) {
            return "Error: User does not exist in the Neosis network.";
        }

        if (requestRepository.existsBySenderEmailAndReceiverEmail(senderEmail, receiverEmail)) {
            return "Request already sent.";
        }
        
        ChatRequest req = new ChatRequest(senderEmail, receiverEmail, "PENDING");
        requestRepository.save(req);
        
        messagingTemplate.convertAndSend("/queue/notifications/" + receiverEmail, "{\"type\": \"NEW_REQUEST\"}");
        
        return "Request Sent";
    }

    @GetMapping("/pending")
    public List<ChatRequest> getPendingRequests(OAuth2AuthenticationToken token) {
        if (token == null) return List.of();
        String myEmail = (String) token.getPrincipal().getAttributes().get("email");
        return requestRepository.findByReceiverEmailAndStatus(myEmail, "PENDING");
    }

    @PostMapping("/accept")
    public String acceptRequest(@RequestParam String requestId, OAuth2AuthenticationToken token) { // CRITICAL FIX: Long -> String
        if (token == null) return "Unauthorized";
        String myEmail = (String) token.getPrincipal().getAttributes().get("email");

        ChatRequest req = requestRepository.findById(requestId).orElse(null);
        if (req != null) {
            if (!req.getReceiverEmail().equalsIgnoreCase(myEmail)) {
                return "Forbidden: You cannot accept a request meant for someone else.";
            }

            req.setStatus("ACCEPTED");
            requestRepository.save(req);
            
            messagingTemplate.convertAndSend("/queue/notifications/" + req.getSenderEmail(), "{\"type\": \"REQUEST_ACCEPTED\"}");
            
            return "Accepted";
        }
        return "Not found";
    }

    @GetMapping("/friends")
    public List<String> getFriendsList(OAuth2AuthenticationToken token) {
        if (token == null) return List.of();
        String myEmail = (String) token.getPrincipal().getAttributes().get("email");
        
        List<ChatRequest> allAccepted = requestRepository.findAllAcceptedForUser(myEmail);
        List<String> friends = new ArrayList<>();
        
        for (ChatRequest req : allAccepted) {
            friends.add(req.getSenderEmail().equals(myEmail) ? req.getReceiverEmail() : req.getSenderEmail());
        }
        return friends;
    }
}