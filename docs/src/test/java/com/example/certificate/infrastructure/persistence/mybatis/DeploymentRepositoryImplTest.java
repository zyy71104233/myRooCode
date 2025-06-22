package com.example.certificate.infrastructure.persistence.mybatis;

import com.example.certificate.TestConfig;
import com.example.certificate.domain.model.CertificateId;
import com.example.certificate.domain.model.Deployment;
import com.example.certificate.domain.model.DeploymentId;
import com.example.certificate.domain.model.DeploymentStatus;
import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@MybatisTest
@Import(TestConfig.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class DeploymentRepositoryImplTest {

    @Autowired
    private DeploymentRepositoryImpl repository;

    private DeploymentId testId;
    private Deployment testDeployment;

    @BeforeEach
    void setUp() {
        testId = new DeploymentId("test-deploy-id");
        testDeployment = new Deployment(
            testId,
            new CertificateId("test-cert-id"),
            "test-environment",
            "test-details"
        ).markAsDeployed();
    }

    @Test
    void shouldSaveAndFindDeployment() {
        // When
        repository.save(testDeployment);
        Optional<Deployment> found = repository.findById(testId);

        // Then
        assertTrue(found.isPresent());
        assertEquals(testId, found.get().getId());
        assertEquals(testDeployment.getCertificateId(), found.get().getCertificateId());
        assertEquals(testDeployment.getStatus(), found.get().getStatus());
    }
}