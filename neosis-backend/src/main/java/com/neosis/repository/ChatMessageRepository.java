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

    @Query(value = "{ '$and': [ { '$or': [ { 'senderEmail': ?0, 'recipientEmail': ?1 }, { 'senderEmail': ?1, 'recipientEmail': ?0 } ] }, { '$or': [ { 'expiresAt': null }, { 'expiresAt': { '$gt': ?2 } } ] } ] }", sort = "{ 'createdAt': -1 }")
    List<ChatMessage> findLatestChatHistory(String user1, String user2, LocalDateTime now, Pageable pageable);

    @Query(value = "{ '$and': [ { 'createdAt': { '$gt': ?2 } }, { '$or': [ { 'senderEmail': ?0, 'recipientEmail': ?1 }, { 'senderEmail': ?1, 'recipientEmail': ?0 } ] }, { '$or': [ { 'expiresAt': null }, { 'expiresAt': { '$gt': ?3 } } ] } ] }", sort = "{ 'createdAt': -1 }")
    List<ChatMessage> findLatestChatHistoryAfter(String user1, String user2, LocalDateTime after, LocalDateTime now, Pageable pageable);

    @Query(value = "{ '$and': [ { '$or': [ { 'senderEmail': ?0, 'recipientEmail': ?1 }, { 'senderEmail': ?1, 'recipientEmail': ?0 } ] }, { '$or': [ { 'expiresAt': null }, { 'expiresAt': { '$gt': ?2 } } ] } ] }", sort = "{ 'createdAt': 1 }")
    List<ChatMessage> findExportableChatHistory(String user1, String user2, LocalDateTime now, Pageable pageable);

    @Query(value = "{ '$and': [ { '$or': [ { 'senderEmail': ?0 }, { 'recipientEmail': ?0 } ] }, { '$or': [ { 'expiresAt': null }, { 'expiresAt': { '$gt': ?1 } } ] } ] }", sort = "{ 'createdAt': 1 }")
    List<ChatMessage> findAllForUser(String email, LocalDateTime now);

    void deleteBySenderEmailOrRecipientEmail(String senderEmail, String recipientEmail);
}
