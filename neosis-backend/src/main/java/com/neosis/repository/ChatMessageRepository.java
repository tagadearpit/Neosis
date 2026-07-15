package com.neosis.repository;

import com.neosis.model.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {

    @Query(value = "{ '$or': [ { 'senderEmail': ?0, 'recipientEmail': ?1 }, { 'senderEmail': ?1, 'recipientEmail': ?0 } ] }", sort = "{ 'createdAt': -1 }")
    List<ChatMessage> findLatestChatHistory(String user1, String user2, Pageable pageable);

    @Query(value = "{ '$and': [ { 'createdAt': { '$gt': ?2 } }, { '$or': [ { 'senderEmail': ?0, 'recipientEmail': ?1 }, { 'senderEmail': ?1, 'recipientEmail': ?0 } ] } ] }", sort = "{ 'createdAt': -1 }")
    List<ChatMessage> findLatestChatHistoryAfter(String user1, String user2, LocalDateTime after, Pageable pageable);

    @Query(value = "{ 'senderEmail': ?0, 'recipientEmail': ?1, 'readAt': null }", count = true)
    long countUnread(String senderEmail, String recipientEmail);

    void deleteBySenderEmailOrRecipientEmail(String senderEmail, String recipientEmail);
}
