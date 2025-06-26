package com.example.certificate.domain.service;

import com.example.certificate.domain.model.Certificate;
import com.example.certificate.domain.model.CertificateType;
import com.example.certificate.domain.model.IssuanceRecord;
import com.example.certificate.domain.model.User;
import com.example.certificate.application.dto.CertificateDTO;

public interface CertificateService {
    Certificate createCertificate(Certificate certificate);
    Certificate updateCertificate(Certificate certificate);
    void revokeCertificate(Long certificateId, String reason);
    IssuanceRecord issueCertificate(Certificate certificate, User user, User issuer);
    CertificateType createCertificateType(CertificateType type);
    CertificateDTO getCertificateDTO(Long certificateId);
}