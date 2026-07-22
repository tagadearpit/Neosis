package com.neosis.repository;

import com.neosis.model.UserSettings;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSettingsRepository extends MongoRepository<UserSettings, String> {
    Optional<UserSettings> findByOwnerEmail(String ownerEmail);
    List<UserSettings> findByOwnerEmailIn(Collection<String> ownerEmails);
    void deleteByOwnerEmail(String ownerEmail);
}
