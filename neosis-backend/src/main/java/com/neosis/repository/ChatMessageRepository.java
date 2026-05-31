package com.neosis.repository;

import com.neosis.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    // CRITICAL FIX: Now sorts by the secure, server-generated 'createdAt' timestamp
    @Query("SELECT m FROM ChatMessage m WHERE (m.senderEmail = :user1 AND m.recipientEmail = :user2) OR (m.senderEmail = :user2 AND m.recipientEmail = :user1) ORDER BY m.createdAt ASC")
    List<ChatMessage> findChatHistory(@Param("user1") String user1, @Param("user2") String user2);
}