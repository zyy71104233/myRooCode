package com.example.certificate.domain.model;

import lombok.Getter;
import java.time.LocalDateTime;
import java.util.Objects;

@Getter
public class Deployment {
    private final DeploymentId id;
    private final CertificateId certificateId;
    private final String targetEnvironment;
    private final DeploymentStatus status;
    private final LocalDateTime deployedAt;
    private final String deploymentDetails;

    public Deployment(DeploymentId id, CertificateId certificateId,
                     String targetEnvironment, String deploymentDetails) {
        Objects.requireNonNull(id, "Deployment ID cannot be null");
        Objects.requireNonNull(certificateId, "Certificate ID cannot be null");
        Objects.requireNonNull(targetEnvironment, "Target environment cannot be null");

        if (targetEnvironment.isEmpty()) {
            throw new IllegalArgumentException("Target environment cannot be empty");
        }

        this.id = id;
        this.certificateId = certificateId;
        this.targetEnvironment = targetEnvironment;
        this.status = DeploymentStatus.PENDING;
        this.deployedAt = LocalDateTime.now();
        this.deploymentDetails = deploymentDetails;
    }

    public Deployment markAsDeployed() {
        return new Deployment(this.id, this.certificateId, this.targetEnvironment,
                           DeploymentStatus.DEPLOYED, this.deployedAt, this.deploymentDetails);
    }

    public Deployment markAsFailed(String errorDetails) {
        return new Deployment(this.id, this.certificateId, this.targetEnvironment,
                           DeploymentStatus.FAILED, this.deployedAt, errorDetails);
    }

    private Deployment(DeploymentId id, CertificateId certificateId,
                      String targetEnvironment, DeploymentStatus status,
                      LocalDateTime deployedAt, String details) {
        this.id = id;
        this.certificateId = certificateId;
        this.targetEnvironment = targetEnvironment;
        this.status = status;
        this.deployedAt = deployedAt;
        this.deploymentDetails = details;
    }
}