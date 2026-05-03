package com.neosis.repository;

import com.neosis.model.ChatRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatRequestRepository extends JpaRepository<ChatRequest, Long> {
    
    // Find requests sent to me that are still pending
    List<ChatRequest> findByReceiverEmailAndStatus(String receiverEmail, String status);
    
    // Check if a request already exists to prevent spamming
    boolean existsBySenderEmailAndReceiverEmail(String senderEmail, String receiverEmail);

    // Find all accepted relationships where I am either the sender or receiver
    @Query("SELECT r FROM ChatRequest r WHERE (r.senderEmail = :email OR r.receiverEmail = :email) AND r.status = 'ACCEPTED'")
    List<ChatRequest> findAllAcceptedForUser(@Param("email") String email);
}
