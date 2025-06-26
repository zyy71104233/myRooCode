package com.example.certificate.domain.model;

import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.assertThat;

class CertificateTest {
    
    @Test
    void shouldCreateValidCertificate() {
        CertificateType type = new CertificateType(1L, "Professional", "Professional certification", 365);
        Certificate certificate = new Certificate(
            1L, "CERT-001", type, "Java Developer",
            "Certified Java Developer", "Holder Name", 1,
            LocalDateTime.now(), LocalDateTime.now().plusDays(365)
        );

        assertThat(certificate.getId()).isEqualTo(1L);
        assertThat(certificate.getCertificateNumber()).isEqualTo("CERT-001");
        assertThat(certificate.getType().getTypeName()).isEqualTo("Professional");
        assertThat(certificate.getStatus()).isEqualTo(1);
        assertThat(certificate.getExpiryDate()).isAfter(LocalDateTime.now());
    }

    @Test
    void shouldDetectExpiredCertificate() {
        CertificateType type = new CertificateType(1L, "Professional", null, 365);
        Certificate certificate = new Certificate(
            1L, "CERT-001", type, "Java Developer",
            "Certified Java Developer", "Holder Name", 1,
            LocalDateTime.now().minusDays(366), LocalDateTime.now().minusDays(1)
        );

        assertThat(certificate.isExpired()).isTrue();
    }
}