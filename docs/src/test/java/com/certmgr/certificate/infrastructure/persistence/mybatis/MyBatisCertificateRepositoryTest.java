package com.certmgr.certificate.infrastructure.persistence.mybatis;

import com.certmgr.certificate.domain.model.CertificateContent;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

@MybatisTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class MyBatisCertificateRepositoryTest {

    private static final String TEST_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----publicKey123";
    private static final String TEST_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----privateKey456";
    private static final String TEST_CERTIFICATE = "-----BEGIN CERTIFICATE-----certificate789";

    @Autowired
    private MyBatisCertificateRepository repository;

    @Test
    void shouldSaveAndFindCertificate() {
        CertificateContent content = new CertificateContent(
            TEST_PUBLIC_KEY,
            TEST_PRIVATE_KEY,
            TEST_CERTIFICATE
        );
        
        repository.save(content);
        Optional<CertificateContent> found = repository.findByPublicKey(TEST_PUBLIC_KEY);
        
        assertTrue(found.isPresent());
        CertificateContent result = found.get();
        assertThat(result.getPublicKey()).isEqualTo(TEST_PUBLIC_KEY);
        assertThat(result.getPrivateKey()).isEqualTo(TEST_PRIVATE_KEY);
        assertThat(result.getCertificateChain()).isEqualTo(TEST_CERTIFICATE);
    }

    @Test
    void shouldDeleteCertificate() {
        CertificateContent content = new CertificateContent(
            TEST_PUBLIC_KEY,
            TEST_PRIVATE_KEY,
            TEST_CERTIFICATE
        );
        
        repository.save(content);
        repository.deleteByPublicKey(TEST_PUBLIC_KEY);
        
        Optional<CertificateContent> found = repository.findByPublicKey(TEST_PUBLIC_KEY);
        assertFalse(found.isPresent());
    }
}