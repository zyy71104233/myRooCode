package com.example.certificate.domain.model;

import com.example.certificate.domain.event.CertificateIssuedEvent;
import com.example.certificate.domain.event.CertificateRevokedEvent;
import com.example.certificate.domain.event.DomainEvent;
import java.util.List;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
class CertificateTest {
    private static final String VALID_DOMAIN = "example.com";
    private static final LocalDateTime FUTURE_DATE = LocalDateTime.now().plusDays(30);
    private static final CertificateContent VALID_CONTENT = new CertificateContent(
        "-----BEGIN PUBLIC KEY-----...",
        "-----BEGIN PRIVATE KEY-----...",
        "-----BEGIN CERTIFICATE-----...",
        "PEM"
    );

    @Test
    void shouldCreateCertificateWithValidParameters() {
        Certificate certificate = new Certificate(
            CertificateId.generate(),
            VALID_DOMAIN,
            VALID_CONTENT,
            FUTURE_DATE
        );

        assertNotNull(certificate);
        assertEquals(VALID_DOMAIN, certificate.getDomainName());
        assertEquals(CertificateStatus.ACTIVE, certificate.getStatus());
        assertFalse(certificate.isExpired());
    }

    @Test
    void shouldThrowWhenDomainNameEmpty() {
        assertThrows(IllegalArgumentException.class, () ->
            new Certificate(
                CertificateId.generate(),
                "",
                VALID_CONTENT,
                FUTURE_DATE
            )
        );
    }

    @Test
    void shouldThrowWhenExpirationDatePast() {
        assertThrows(IllegalArgumentException.class, () ->
            new Certificate(
                CertificateId.generate(),
                VALID_DOMAIN,
                VALID_CONTENT,
                LocalDateTime.now().minusDays(1)
            )
        );
    }

    @Test
    void shouldEmitIssuedEventWhenCreated() {
        Certificate certificate = new Certificate(
            CertificateId.generate(),
            "example.com",
            VALID_CONTENT,
            LocalDateTime.now().plusDays(90)
        );

        List<DomainEvent> events = certificate.getDomainEvents();
        assertEquals(1, events.size());
        assertTrue(events.get(0) instanceof CertificateIssuedEvent);
    }

    @Test
    void shouldEmitRevokedEventWhenRevoked() {
        Certificate certificate = new Certificate(
            CertificateId.generate(),
            "example.com",
            VALID_CONTENT,
            LocalDateTime.now().plusDays(90)
        );
        certificate.clearDomainEvents();

        Certificate revoked = certificate.revoke();
        List<DomainEvent> events = revoked.getDomainEvents();
        
        assertEquals(1, events.size());
        assertTrue(events.get(0) instanceof CertificateRevokedEvent);
    }

    @Test
    void shouldClearEventsAfterRetrieval() {
        Certificate certificate = new Certificate(
            CertificateId.generate(),
            "example.com",
            VALID_CONTENT,
            LocalDateTime.now().plusDays(90)
        );
        
        assertFalse(certificate.getDomainEvents().isEmpty());
        assertTrue(certificate.getDomainEvents().isEmpty());
    }

    @Test
    void shouldRevokeActiveCertificate() {
        Certificate certificate = new Certificate(
            CertificateId.generate(),
            VALID_DOMAIN,
            VALID_CONTENT,
            FUTURE_DATE
        );

        Certificate revoked = certificate.revoke();
        assertEquals(CertificateStatus.REVOKED, revoked.getStatus());
    }

    @Test
    void shouldThrowWhenRevokingRevokedCertificate() {
        Certificate certificate = new Certificate(
            CertificateId.generate(),
            VALID_DOMAIN,
            VALID_CONTENT,
            FUTURE_DATE
        ).revoke();

        assertThrows(IllegalStateException.class, certificate::revoke);
    }
}