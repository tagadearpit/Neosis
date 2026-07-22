package com.neosis.repository;

import com.neosis.model.ChatRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ChatRequestRepository extends MongoRepository<ChatRequest, String> {

    List<ChatRequest> findByReceiverEmailAndStatus(String receiverEmail, String status);

    boolean existsByPairKeyAndStatusIn(String pairKey, Collection<String> statuses);

    boolean existsByPairKeyAndStatus(String pairKey, String status);

    @Query("{ '$or': [ { 'senderEmail': ?0 }, { 'receiverEmail': ?0 } ], 'status': 'ACCEPTED' }")
    List<ChatRequest> findAllAcceptedForUser(String email);

    @Query("{ '$or': [ { 'senderEmail': ?0 }, { 'receiverEmail': ?0 } ] }")
    List<ChatRequest> findAllForUser(String email);

    long deleteByPairKeyAndStatus(String pairKey, String status);

    void deleteBySenderEmailOrReceiverEmail(String senderEmail, String receiverEmail);
}
