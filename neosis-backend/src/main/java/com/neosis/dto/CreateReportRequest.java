package com.neosis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateReportRequest(
    @NotBlank @Size(max = 320) String reportedEmail,
    @NotBlank @Size(max = 32) String category,
    @Size(max = 1000) String details,
    @Size(max = 64) String messageId
) {}
