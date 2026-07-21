package com.neosis.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;

@Configuration
public class MongoIndexConfiguration {

    @Bean
    ApplicationRunner ensureGridFsIndexes(MongoTemplate mongoTemplate) {
        return args -> {
            mongoTemplate.indexOps("fs.files").ensureIndex(
                new Index().on("metadata.publicId", Sort.Direction.ASC).unique().sparse().named("media_public_id_idx")
            );
            mongoTemplate.indexOps("fs.files").ensureIndex(
                new Index().on("metadata.senderEmail", Sort.Direction.ASC).named("media_sender_idx")
            );
            mongoTemplate.indexOps("fs.files").ensureIndex(
                new Index().on("metadata.recipientEmail", Sort.Direction.ASC).named("media_recipient_idx")
            );
        };
    }
}
