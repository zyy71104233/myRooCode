package com.certmgr.certificate.domain.model;

import lombok.Value;

@Value
public class CertificateContent {
    String publicKey;
    String privateKey;
    String certificateChain;  

    public CertificateContent(String publicKey, String privateKey, String certificateChain) {
        validatePublicKey(publicKey);
        validatePrivateKey(privateKey);
        validateCertificateChain(certificateChain);
        
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.certificateChain = certificateChain;
    }

    private void validatePublicKey(String publicKey) {
        if (publicKey == null || !publicKey.startsWith("-----BEGIN PUBLIC KEY-----")) {
            throw new IllegalArgumentException("Invalid public key format");
        }
    }

    private void validatePrivateKey(String privateKey) {
        if (privateKey == null || !privateKey.startsWith("-----BEGIN PRIVATE KEY-----")) {
            throw new IllegalArgumentException("Invalid private key format");
        }
    }

    private void validateCertificateChain(String certificateChain) {
        if (certificateChain == null || !certificateChain.contains("-----BEGIN CERTIFICATE-----")) {
            throw new IllegalArgumentException("Invalid certificate chain");
        }
    }
}