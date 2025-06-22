package com.example.certificate.domain.service;

import com.example.certificate.domain.model.*;
import com.example.certificate.domain.repository.CertificateRepository;
import com.example.certificate.domain.repository.DeploymentRepository;
import java.time.LocalDateTime;

public class CertificateManagementService {
    private final CertificateRepository certificateRepository;
    private final DeploymentRepository deploymentRepository;

    public CertificateManagementService(CertificateRepository certificateRepository,
                                     DeploymentRepository deploymentRepository) {
        this.certificateRepository = certificateRepository;
        this.deploymentRepository = deploymentRepository;
    }

    public Certificate createCertificate(String domainName, 
                                       CertificateContent content,
                                       LocalDateTime expiresAt) {
        Certificate certificate = new Certificate(
            CertificateId.generate(),
            domainName,
            content,
            expiresAt
        );
        return certificateRepository.save(certificate);
    }

    public Certificate revokeCertificate(CertificateId certificateId) {
        Certificate certificate = certificateRepository.findById(certificateId)
            .orElseThrow(() -> new IllegalArgumentException("Certificate not found"));
        
        return certificateRepository.save(certificate.revoke());
    }

    public Deployment deployCertificate(CertificateId certificateId,
                                      String targetEnvironment,
                                      String deploymentDetails) {
        Certificate certificate = certificateRepository.findById(certificateId)
            .orElseThrow(() -> new IllegalArgumentException("Certificate not found"));
        
        if (certificate.getStatus() != CertificateStatus.ACTIVE) {
            throw new IllegalStateException("Only active certificates can be deployed");
        }

        Deployment deployment = new Deployment(
            DeploymentId.generate(),
            certificateId,
            targetEnvironment,
            deploymentDetails
        );
        return deploymentRepository.save(deployment);
    }
}