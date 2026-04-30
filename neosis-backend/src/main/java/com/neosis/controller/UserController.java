package com.neosis.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:5173") // Allow your Vite frontend to call this API
public class UserController {

    // TODO: Inject UserRepository here later to check the real PostgreSQL database
    
    @GetMapping("/check")
    public ResponseEntity<?> checkUserExists(@RequestParam String email) {
        // Mock logic: Pretend "bob@gmail.com" is the only user in the database
        if ("bob@gmail.com".equalsIgnoreCase(email)) {
            return ResponseEntity.ok().body("User found");
        } else {
            // Returns a 404 Not Found, which triggers the specific error in your React app
            return ResponseEntity.status(404).body("Sender does not exist"); 
        }
    }
}
