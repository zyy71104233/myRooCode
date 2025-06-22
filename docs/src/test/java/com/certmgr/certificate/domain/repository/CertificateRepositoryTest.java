package com.certmgr.certificate.domain.repository;

import com.certmgr.certificate.domain.model.CertificateContent;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;

public interface CertificateRepositoryTest<T extends CertificateRepository> {

    T createRepository();

    @Test
    default void shouldSaveAndRetrieveCertificate() {
        CertificateRepository repository = createRepository();
        CertificateContent cert = new CertificateContent(
            "-----BEGIN PUBLIC KEY-----test-----END PUBLIC KEY-----",
            "-----BEGIN PRIVATE KEY-----test-----END PRIVATE KEY-----",
            "-----BEGIN CERTIFICATE-----test-----END CERTIFICATE-----"
        );
        
        CertificateContent saved = repository.save(cert);
        Optional<CertificateContent> found = repository.findByPublicKey(saved.getPublicKey());
        
        assertTrue(found.isPresent());
        assertEquals(saved, found.get());
    }

    @Test
    default void shouldReturnEmptyWhenNotFound() {
        CertificateRepository repository = createRepository();
        Optional<CertificateContent> found = repository.findByPublicKey("nonexistent");
        assertFalse(found.isPresent());
    }

    @Test
    default void shouldDeleteCertificate() {
        CertificateRepository repository = createRepository();
        CertificateContent cert = new CertificateContent(
            "-----BEGIN PUBLIC KEY-----test-----END PUBLIC KEY-----",
            "-----BEGIN PRIVATE KEY-----test-----END PRIVATE KEY-----",
            "-----BEGIN CERTIFICATE-----test-----END CERTIFICATE-----"
        );
        CertificateContent saved = repository.save(cert);
        
        repository.deleteByPublicKey(saved.getPublicKey());
        Optional<CertificateContent> found = repository.findByPublicKey(saved.getPublicKey());
        
        assertFalse(found.isPresent());
    }
}