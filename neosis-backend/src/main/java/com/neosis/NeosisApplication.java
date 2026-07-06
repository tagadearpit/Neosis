package com.neosis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication
@EnableMongoAuditing // CRITICAL FIX: Enables auto-population of @CreatedDate in Mongo
public class NeosisApplication {

    public static void main(String[] args) {
        SpringApplication.run(NeosisApplication.class, args);
    }

}