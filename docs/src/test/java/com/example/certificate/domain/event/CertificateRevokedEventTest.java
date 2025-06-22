package com.example.certificate.domain.event;

import com.example.certificate.domain.model.CertificateId;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class CertificateRevokedEventTest {
    @Test
    void shouldCreateEventWithCorrectValues() {
        CertificateId id = new CertificateId("cert-123");
        String reason = "Key compromise";
        
        CertificateRevokedEvent event = new CertificateRevokedEvent(
            id, 
            CertificateRevokedEvent.RevocationReason.KEY_COMPROMISE,
            reason
        );
        
        assertEquals(id, event.certificateId());
        assertEquals(CertificateRevokedEvent.RevocationReason.KEY_COMPROMISE, event.reason());
        assertEquals(reason, event.description());
        assertNotNull(event.occurredOn());
    }

    @Test
    void shouldSupportAllRevocationReasons() {
        for (CertificateRevokedEvent.RevocationReason reason : 
             CertificateRevokedEvent.RevocationReason.values()) {
            CertificateRevokedEvent event = new CertificateRevokedEvent(
                new CertificateId("cert-123"),
                reason,
                "Test reason"
            );
            assertEquals(reason, event.reason());
        }
    }
}