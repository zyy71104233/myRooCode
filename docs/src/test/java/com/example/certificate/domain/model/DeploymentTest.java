package com.example.certificate.domain.model;

import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

class DeploymentTest {
    private static final String VALID_ENV = "production";
    private static final String DEPLOY_DETAILS = "Deployed to load balancer";
    private static final CertificateId CERT_ID = CertificateId.generate();

    @Test
    void shouldCreateDeploymentWithValidParameters() {
        Deployment deployment = new Deployment(
            DeploymentId.generate(),
            CERT_ID,
            VALID_ENV,
            DEPLOY_DETAILS
        );

        assertNotNull(deployment);
        assertEquals(CERT_ID, deployment.getCertificateId());
        assertEquals(VALID_ENV, deployment.getTargetEnvironment());
        assertEquals(DeploymentStatus.PENDING, deployment.getStatus());
    }

    @Test
    void shouldThrowWhenEnvironmentEmpty() {
        assertThrows(IllegalArgumentException.class, () ->
            new Deployment(
                DeploymentId.generate(),
                CERT_ID,
                "",
                DEPLOY_DETAILS
            )
        );
    }

    @Test
    void shouldMarkAsDeployed() {
        Deployment deployment = new Deployment(
            DeploymentId.generate(),
            CERT_ID,
            VALID_ENV,
            DEPLOY_DETAILS
        );

        Deployment deployed = deployment.markAsDeployed();
        assertEquals(DeploymentStatus.DEPLOYED, deployed.getStatus());
    }

    @Test
    void shouldMarkAsFailed() {
        Deployment deployment = new Deployment(
            DeploymentId.generate(),
            CERT_ID,
            VALID_ENV,
            DEPLOY_DETAILS
        );

        String error = "Connection timeout";
        Deployment failed = deployment.markAsFailed(error);
        assertEquals(DeploymentStatus.FAILED, failed.getStatus());
        assertEquals(error, failed.getDeploymentDetails());
    }
}