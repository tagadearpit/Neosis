package com.neosis.repository;

import com.neosis.model.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> { // Changed to String
    
    // CRITICAL FIX: Converted JPQL to MongoDB JSON syntax with ascending sort
    @Query(value = "{ '$or': [ { 'senderEmail': ?0, 'recipientEmail': ?1 }, { 'senderEmail': ?1, 'recipientEmail': ?0 } ] }", sort = "{ 'createdAt': 1 }")
    List<ChatMessage> findChatHistory(String user1, String user2);
}