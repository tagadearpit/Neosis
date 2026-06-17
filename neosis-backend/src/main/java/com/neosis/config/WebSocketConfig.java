package com.neosis.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.frontend.url:https://neosis-static-site.onrender.com}")
    private String frontendUrl;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String cleanFrontendUrl = frontendUrl.endsWith("/") ? 
            frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
            
        registry.addEndpoint("/ws")
                .setAllowedOrigins("http://localhost:5173", cleanFrontendUrl)
                .withSockJS(); 
    }

    // ==========================================================
    // CRITICAL FIX: Overriding the default 64KB WebSocket limit
    // Allows Base64 documents and media up to 5MB to pass safely
    // ==========================================================
    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(5 * 1024 * 1024); // 5MB
        registration.setSendBufferSizeLimit(5 * 1024 * 1024); // 5MB
        registration.setSendTimeLimit(20000); 
    }
}
