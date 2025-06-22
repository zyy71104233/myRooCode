package com.example.certificate.infrastructure.persistence.mybatis;

import com.example.certificate.TestConfig;
import com.example.certificate.domain.model.Certificate;
import com.example.certificate.domain.model.CertificateId;
import com.example.certificate.domain.model.CertificateContent;
import com.example.certificate.domain.model.CertificateStatus;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestConfig.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CertificateRepositoryImplTest {

    @Autowired
    private CertificateRepositoryImpl repository;

    private CertificateId testId;
    private Certificate testCertificate;

    @BeforeEach
    void setUp() {
        testId = new CertificateId("test-cert-id");
        testCertificate = new Certificate(
            testId,
            "test-domain",
            new CertificateContent("test-public-key", "test-private-key", "test-chain", "PEM"),
            LocalDateTime.now().plusYears(1)
        );
    }

    @Test
    void shouldSaveAndFindCertificate() {
        // When
        repository.save(testCertificate);
        Optional<Certificate> found = repository.findById(testId);

        // Then
        assertTrue(found.isPresent());
        assertEquals(testId, found.get().getId());
        assertEquals(testCertificate.getContent(), found.get().getContent());
        assertEquals(testCertificate.getStatus(), found.get().getStatus());
    }
}