package com.example.certificate.domain.model;

import lombok.Value;
import java.util.UUID;

@Value
public class CertificateId {
    private final UUID value;

    public CertificateId(UUID value) {
        if (value == null) {
            throw new IllegalArgumentException("Certificate ID cannot be null");
        }
        this.value = value;
    }

    public CertificateId(String value) {
        this(UUID.fromString(value));
    }

    public static CertificateId generate() {
        return new CertificateId(UUID.randomUUID());
    }

    @Override
    public String toString() {
        return value.toString();
    }
}