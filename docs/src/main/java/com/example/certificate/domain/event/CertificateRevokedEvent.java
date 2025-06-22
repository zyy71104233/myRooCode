package com.example.certificate.domain.event;

import com.example.certificate.domain.model.CertificateId;
import java.time.LocalDateTime;

public class CertificateRevokedEvent implements DomainEvent {
    private final CertificateId certificateId;
    private final RevocationReason reason;
    private final String description;
    private final LocalDateTime occurredOn;

    public CertificateRevokedEvent(CertificateId certificateId,
                                RevocationReason reason,
                                String description) {
        this(certificateId, reason, description, LocalDateTime.now());
    }

    public CertificateRevokedEvent(CertificateId certificateId,
                                RevocationReason reason,
                                String description,
                                LocalDateTime occurredOn) {
        this.certificateId = certificateId;
        this.reason = reason;
        this.description = description;
        this.occurredOn = occurredOn;
    }

    public CertificateId certificateId() {
        return certificateId;
    }

    public RevocationReason reason() {
        return reason;
    }

    public String description() {
        return description;
    }

    @Override
    public LocalDateTime occurredOn() {
        return occurredOn;
    }

    public enum RevocationReason {
        KEY_COMPROMISE,
        CA_COMPROMISE,
        SUPERSEDED,
        CESSATION_OF_OPERATION
    }
}