package com.neosis.repository;

import com.neosis.model.ChatRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatRequestRepository extends MongoRepository<ChatRequest, String> { // Changed to String
    
    List<ChatRequest> findByReceiverEmailAndStatus(String receiverEmail, String status);
    
    boolean existsBySenderEmailAndReceiverEmail(String senderEmail, String receiverEmail);

    // CRITICAL FIX: Converted JPQL to MongoDB JSON Query syntax
    @Query("{ '$or': [ { 'senderEmail': ?0 }, { 'receiverEmail': ?0 } ], 'status': 'ACCEPTED' }")
    List<ChatRequest> findAllAcceptedForUser(String email);
}