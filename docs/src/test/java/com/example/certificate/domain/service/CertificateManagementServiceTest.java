package com.example.certificate.domain.service;

import com.example.certificate.domain.model.*;
import com.example.certificate.domain.repository.CertificateRepository;
import com.example.certificate.domain.repository.DeploymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CertificateManagementServiceTest {
    @Mock
    private CertificateRepository certificateRepository;
    @Mock
    private DeploymentRepository deploymentRepository;
    @InjectMocks
    private CertificateManagementService service;

    private static final String DOMAIN = "example.com";
    private static final LocalDateTime EXPIRES = LocalDateTime.now().plusDays(30);
    private static final CertificateContent CONTENT = new CertificateContent(
        "public", "private", "chain", "PEM");

    @Test
    void shouldCreateCertificate() {
        when(certificateRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        
        Certificate certificate = service.createCertificate(DOMAIN, CONTENT, EXPIRES);
        
        assertNotNull(certificate);
        assertEquals(DOMAIN, certificate.getDomainName());
        assertEquals(CertificateStatus.ACTIVE, certificate.getStatus());
    }

    @Test
    void shouldRevokeCertificate() {
        Certificate activeCert = new Certificate(
            CertificateId.generate(), DOMAIN, CONTENT, EXPIRES);
        when(certificateRepository.findById(activeCert.getId()))
            .thenReturn(Optional.of(activeCert));
        when(certificateRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        
        Certificate revoked = service.revokeCertificate(activeCert.getId());
        
        assertEquals(CertificateStatus.REVOKED, revoked.getStatus());
    }

    @Test
    void shouldDeployCertificate() {
        Certificate activeCert = new Certificate(
            CertificateId.generate(), DOMAIN, CONTENT, EXPIRES);
        when(certificateRepository.findById(activeCert.getId()))
            .thenReturn(Optional.of(activeCert));
        when(deploymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        
        Deployment deployment = service.deployCertificate(
            activeCert.getId(), "production", "Deploy details");
        
        assertNotNull(deployment);
        assertEquals(activeCert.getId(), deployment.getCertificateId());
    }

    @Test
    void shouldThrowWhenDeployingRevokedCertificate() {
        Certificate revokedCert = new Certificate(
            CertificateId.generate(), DOMAIN, CONTENT, EXPIRES).revoke();
        when(certificateRepository.findById(revokedCert.getId()))
            .thenReturn(Optional.of(revokedCert));
        
        assertThrows(IllegalStateException.class, () ->
            service.deployCertificate(revokedCert.getId(), "production", "details"));
    }
}