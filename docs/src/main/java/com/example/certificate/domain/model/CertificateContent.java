package com.example.certificate.domain.model;

import lombok.Value;

@Value
public class CertificateContent {
    private final String publicKey;
    private final String privateKey;
    private final String certificateChain;
    private final String format;  // 如 "PEM", "DER"

    public CertificateContent(String publicKey, String privateKey,
                            String certificateChain, String format) {
        validateKeys(publicKey, privateKey);
        validateChain(certificateChain);
        validateFormat(format);

        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.certificateChain = certificateChain;
        this.format = format;
    }

    private void validateKeys(String publicKey, String privateKey) {
        if (publicKey == null || publicKey.isEmpty()) {
            throw new IllegalArgumentException("Public key cannot be empty");
        }
        if (privateKey == null || privateKey.isEmpty()) {
            throw new IllegalArgumentException("Private key cannot be empty");
        }
    }

    private void validateChain(String certificateChain) {
        if (certificateChain == null || certificateChain.isEmpty()) {
            throw new IllegalArgumentException("Certificate chain cannot be empty");
        }
    }

    private void validateFormat(String format) {
        if (!"PEM".equals(format) && !"DER".equals(format)) {
            throw new IllegalArgumentException("Invalid certificate format");
        }
    }
}