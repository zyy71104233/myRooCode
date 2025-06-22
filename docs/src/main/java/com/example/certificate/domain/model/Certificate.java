package com.example.certificate.domain.model;

import lombok.Getter;
import com.example.certificate.domain.event.CertificateIssuedEvent;
import com.example.certificate.domain.event.CertificateRevokedEvent;
import com.example.certificate.domain.event.DomainEvent;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.ArrayList;
import java.util.List;

@Getter
public class Certificate {
    private final List<DomainEvent> domainEvents = new ArrayList<>();
    private final CertificateId id;
    private final String domainName;
    private final CertificateStatus status;
    private final LocalDateTime createdAt;
    private final LocalDateTime expiresAt;
    private final CertificateContent content;

    public Certificate(CertificateId id, String domainName, 
                      CertificateContent content, LocalDateTime expiresAt) {
        Objects.requireNonNull(id, "Certificate ID cannot be null");
        Objects.requireNonNull(domainName, "Domain name cannot be null");
        Objects.requireNonNull(content, "Certificate content cannot be null");
        Objects.requireNonNull(expiresAt, "Expiration date cannot be null");

        if (domainName.isEmpty()) {
            throw new IllegalArgumentException("Domain name cannot be empty");
        }
        if (expiresAt.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Expiration date must be in the future");
        }

        this.id = id;
        this.domainName = domainName;
        this.content = content;
        this.expiresAt = expiresAt;
        this.status = CertificateStatus.ACTIVE;
        this.createdAt = LocalDateTime.now();
        this.domainEvents.add(new CertificateIssuedEvent(id, domainName, expiresAt));
    }

    public Certificate revoke() {
        if (this.status == CertificateStatus.REVOKED) {
            throw new IllegalStateException("Certificate already revoked");
        }
        Certificate revokedCert = new Certificate(this.id, this.domainName, this.content,
                                                this.expiresAt, CertificateStatus.REVOKED);
        revokedCert.domainEvents.add(new CertificateRevokedEvent(id,
            CertificateRevokedEvent.RevocationReason.SUPERSEDED, "Certificate revoked"));
        return revokedCert;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }

    private Certificate(CertificateId id, String domainName, 
                       CertificateContent content, LocalDateTime expiresAt,
                       CertificateStatus status) {
        this.id = id;
        this.domainName = domainName;
        this.content = content;
        this.expiresAt = expiresAt;
        this.status = status;
        this.createdAt = LocalDateTime.now();
    }

    public List<DomainEvent> getDomainEvents() {
        List<DomainEvent> events = new ArrayList<>(domainEvents);
        domainEvents.clear();
        return events;
    }

    public void clearDomainEvents() {
        domainEvents.clear();
    }

    public CertificateStatus getStatus() {
        return status;
    }
}