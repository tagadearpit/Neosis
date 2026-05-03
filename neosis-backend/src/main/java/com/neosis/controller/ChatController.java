package com.neosis.controller;

import com.neosis.model.ChatMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // React will send messages to "/app/chat.send"
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        // We route the message instantly to the recipient's specific queue
        messagingTemplate.convertAndSend("/queue/messages/" + chatMessage.getRecipientEmail(), chatMessage);
    }
}
