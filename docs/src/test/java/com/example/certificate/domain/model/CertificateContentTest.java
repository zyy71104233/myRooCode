package com.example.certificate.domain.model;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CertificateContentTest {
    private static final String VALID_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----...";
    private static final String VALID_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----...";
    private static final String VALID_CHAIN = "-----BEGIN CERTIFICATE-----...";

    @Test
    void shouldThrowWhenPublicKeyInvalid() {
        assertThrows(IllegalArgumentException.class, () -> 
            new CertificateContent("", VALID_PRIVATE_KEY, VALID_CHAIN, "PEM"));
    }

    @Test
    void shouldThrowWhenPrivateKeyInvalid() {
        assertThrows(IllegalArgumentException.class, () -> 
            new CertificateContent(VALID_PUBLIC_KEY, "", VALID_CHAIN, "PEM"));
    }

    @Test
    void shouldThrowWhenChainInvalid() {
        assertThrows(IllegalArgumentException.class, () -> 
            new CertificateContent(VALID_PUBLIC_KEY, VALID_PRIVATE_KEY, "", "PEM"));
    }

    @Test
    void shouldThrowWhenFormatInvalid() {
        assertThrows(IllegalArgumentException.class, () -> 
            new CertificateContent(VALID_PUBLIC_KEY, VALID_PRIVATE_KEY, VALID_CHAIN, "INVALID"));
    }

    @Test
    void shouldCreateWhenAllValid() {
        CertificateContent content = new CertificateContent(
            VALID_PUBLIC_KEY, VALID_PRIVATE_KEY, VALID_CHAIN, "PEM");
        
        assertNotNull(content);
        assertEquals(VALID_PUBLIC_KEY, content.getPublicKey());
        assertEquals(VALID_PRIVATE_KEY, content.getPrivateKey());
        assertEquals(VALID_CHAIN, content.getCertificateChain());
        assertEquals("PEM", content.getFormat());
    }
}