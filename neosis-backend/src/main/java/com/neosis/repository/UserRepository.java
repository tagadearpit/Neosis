package com.neosis.repository;

import com.neosis.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends MongoRepository<User, String> { // Changed to String
    User findByEmail(String email);
}