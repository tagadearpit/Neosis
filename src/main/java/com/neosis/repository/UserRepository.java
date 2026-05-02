package com.neosis.repository;

import com.neosis.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Spring Data JPA magically writes the SQL for this based on the method name!
    User findByEmail(String email);
    
}
