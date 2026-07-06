package com.neosis.repository;

import com.neosis.model.ChatRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRequestRepository extends MongoRepository<ChatRequest, String> {

    List<ChatRequest> findByReceiverEmailAndStatus(String receiverEmail, String status);

    boolean existsByPairKeyAndStatusIn(String pairKey, Collection<String> statuses);

    Optional<ChatRequest> findByPairKeyAndStatus(String pairKey, String status);

    @Query("{ '$or': [ { 'senderEmail': ?0, 'receiverEmail': ?1 }, { 'senderEmail': ?1, 'receiverEmail': ?0 } ], 'status': 'ACCEPTED' }")
    List<ChatRequest> findAcceptedBetween(String user1, String user2);

    @Query("{ '$or': [ { 'senderEmail': ?0 }, { 'receiverEmail': ?0 } ], 'status': 'ACCEPTED' }")
    List<ChatRequest> findAllAcceptedForUser(String email);
}
