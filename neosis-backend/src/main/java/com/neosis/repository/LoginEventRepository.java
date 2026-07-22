package com.neosis.repository;

import com.neosis.model.LoginEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoginEventRepository extends MongoRepository<LoginEvent, String> {
    boolean existsByOwnerEmailAndDeviceAndBrowserAndMaskedIp(String ownerEmail, String device, String browser, String maskedIp);
    List<LoginEvent> findByOwnerEmailOrderByCreatedAtDesc(String ownerEmail, Pageable pageable);
    void deleteByOwnerEmail(String ownerEmail);
}
