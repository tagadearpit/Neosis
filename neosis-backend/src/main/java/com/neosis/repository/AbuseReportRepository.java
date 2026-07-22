package com.neosis.repository;

import com.neosis.model.AbuseReport;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AbuseReportRepository extends MongoRepository<AbuseReport, String> {
    List<AbuseReport> findByReporterEmailOrderByCreatedAtDesc(String reporterEmail);
    List<AbuseReport> findByReportedEmail(String reportedEmail);
    void deleteByReporterEmail(String reporterEmail);
}
