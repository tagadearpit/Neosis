package com.neosis.controller;

import com.neosis.model.ChatMessage;
import com.neosis.repository.ChatMessageRepository;
import com.neosis.repository.ChatRequestRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private ChatRequestRepository requestRepository;

    @GetMapping("/history/{friendEmail}")
    public List<ChatMessage> getChatHistory(
        @PathVariable String friendEmail,
        @RequestParam(defaultValue = "50") int limit,
        OAuth2AuthenticationToken token
    ) {
        String myEmail = authenticatedEmail(token);
        String friend = normalizeEmail(friendEmail);
        if (myEmail == null || friend == null) return List.of();
        if (myEmail.equals(friend) || requestRepository.findAcceptedBetween(myEmail, friend).isEmpty()) return List.of();

        int safeLimit = Math.max(1, Math.min(limit, 100));
        Pageable pageable = PageRequest.of(0, safeLimit);
        List<ChatMessage> latest = chatMessageRepository.findLatestChatHistory(myEmail, friend, pageable);
        List<ChatMessage> ordered = new ArrayList<>(latest);
        Collections.reverse(ordered);
        return ordered;
    }

    private String authenticatedEmail(OAuth2AuthenticationToken token) {
        if (token == null || token.getPrincipal() == null) return null;
        Object email = token.getPrincipal().getAttributes().get("email");
        return normalizeEmail(email == null ? token.getName() : email.toString());
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }
}
