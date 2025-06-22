package com.certmgr.certificate.domain.model;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class CertificateContentTest {
    private static final String VALID_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----";
    private static final String VALID_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----";
    private static final String VALID_CERT_CHAIN = "-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----";

    @Test
    void shouldCreateWithValidContent() {
        assertThatCode(() -> new CertificateContent(
            VALID_PUBLIC_KEY,
            VALID_PRIVATE_KEY,
            VALID_CERT_CHAIN
        )).doesNotThrowAnyException();
    }

    @Test
    void shouldRejectInvalidPublicKey() {
        assertThatThrownBy(() -> new CertificateContent(
            "INVALID_PUBLIC_KEY",
            VALID_PRIVATE_KEY,
            VALID_CERT_CHAIN
        )).isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Invalid public key format");
    }

    @Test
    void shouldRejectInvalidPrivateKey() {
        assertThatThrownBy(() -> new CertificateContent(
            VALID_PUBLIC_KEY,
            "INVALID_PRIVATE_KEY",
            VALID_CERT_CHAIN
        )).isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Invalid private key format");
    }

    @Test
    void shouldRejectInvalidCertificateChain() {
        assertThatThrownBy(() -> new CertificateContent(
            VALID_PUBLIC_KEY,
            VALID_PRIVATE_KEY,
            "INVALID_CERT_CHAIN"
        )).isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Invalid certificate chain");
    }
}