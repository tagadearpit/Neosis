package com.neosis.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // These are the prefixes the server will use to send messages BACK to the frontend
        // /topic is generally for public chats, /queue is for private 1-on-1 chats
        config.enableSimpleBroker("/topic", "/queue");
        
        // This is the prefix the frontend will use to send messages TO the server
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // This is the initial connection point for the WebSocket
        // setAllowedOriginPatterns("*") is important for local development to avoid CORS errors
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS(); // Fallback option for older browsers
    }
}
