package com.neosis.config;

import com.neosis.model.User;
import com.neosis.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WebSocketRateLimitInterceptorTest {

    @Test
    void rejectsConnectionBeforeTermsAcceptance() {
        UserRepository repository = mock(UserRepository.class);
        User user = new User();
        user.setEmail("user@example.com");
        when(repository.findByEmail("user@example.com")).thenReturn(user);

        WebSocketRateLimitInterceptor interceptor = new WebSocketRateLimitInterceptor(repository);
        Message<byte[]> connect = message(StompCommand.CONNECT, null);

        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(connect, null));
    }

    @Test
    void rejectsUnknownSendDestination() {
        WebSocketRateLimitInterceptor interceptor = new WebSocketRateLimitInterceptor(mock(UserRepository.class));
        Message<byte[]> send = message(StompCommand.SEND, "/topic/broadcast");

        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(send, null));
    }

    private Message<byte[]> message(StompCommand command, String destination) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setUser(() -> "user@example.com");
        if (destination != null) accessor.setDestination(destination);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
