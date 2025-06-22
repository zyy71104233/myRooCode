package com.example.certificate.domain.event;

import com.example.certificate.domain.model.CertificateId;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class CertificateIssuedEventTest {
    @Test
    void shouldCreateEventWithCorrectValues() {
        CertificateId id = new CertificateId("cert-123");
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(90);
        String domainName = "example.com";
        
        CertificateIssuedEvent event = new CertificateIssuedEvent(id, domainName, expiresAt);
        
        assertEquals(id, event.certificateId());
        assertEquals(domainName, event.domainName());
        assertEquals(expiresAt, event.expiresAt());
        assertNotNull(event.occurredOn());
    }
}