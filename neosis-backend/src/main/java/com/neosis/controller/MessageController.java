package com.neosis.controller;

import com.neosis.model.ChatMessage;
import com.neosis.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @GetMapping("/history/{friendEmail}")
    public List<ChatMessage> getChatHistory(@PathVariable String friendEmail, OAuth2AuthenticationToken token) {
        if (token == null) return List.of();
        String myEmail = (String) token.getPrincipal().getAttributes().get("email");
        return chatMessageRepository.findChatHistory(myEmail, friendEmail);
    }
}