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

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        // Safe standard limits. Media is now handled efficiently by the HTTP REST endpoints.
        registration.setMessageSizeLimit(512 * 1024); 
        registration.setSendBufferSizeLimit(512 * 1024); 
        registration.setSendTimeLimit(20000); 
    }
}
