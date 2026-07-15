package com.neosis.repository;

import com.neosis.model.ConversationPreference;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationPreferenceRepository extends MongoRepository<ConversationPreference, String> {
    Optional<ConversationPreference> findByOwnerEmailAndContactEmail(String ownerEmail, String contactEmail);
    List<ConversationPreference> findByOwnerEmail(String ownerEmail);
    void deleteByOwnerEmailOrContactEmail(String ownerEmail, String contactEmail);
    void deleteByOwnerEmailAndContactEmail(String ownerEmail, String contactEmail);
}
