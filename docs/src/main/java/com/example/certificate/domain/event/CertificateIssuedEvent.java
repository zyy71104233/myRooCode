package com.example.certificate.domain.event;

import com.example.certificate.domain.model.CertificateId;
import java.time.LocalDateTime;

public class CertificateIssuedEvent implements DomainEvent {
    private final CertificateId certificateId;
    private final String domainName;
    private final LocalDateTime expiresAt;
    private final LocalDateTime occurredOn;

    public CertificateIssuedEvent(CertificateId certificateId,
                             String domainName,
                             LocalDateTime expiresAt) {
        this(certificateId, domainName, expiresAt, LocalDateTime.now());
    }

    public CertificateIssuedEvent(CertificateId certificateId,
                             String domainName,
                             LocalDateTime expiresAt,
                             LocalDateTime occurredOn) {
        this.certificateId = certificateId;
        this.domainName = domainName;
        this.expiresAt = expiresAt;
        this.occurredOn = occurredOn;
    }

    public CertificateId certificateId() {
        return certificateId;
    }

    public String domainName() {
        return domainName;
    }

    public LocalDateTime expiresAt() {
        return expiresAt;
    }

    @Override
    public LocalDateTime occurredOn() {
        return occurredOn;
    }
}