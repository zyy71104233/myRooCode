package com.example.certificate.domain.repository;

import com.example.certificate.domain.model.Certificate;
import com.example.certificate.domain.model.CertificateId;
import java.util.Optional;

public interface CertificateRepository {
    Optional<Certificate> findById(CertificateId id);
    Certificate save(Certificate certificate);
    void delete(CertificateId id);
    boolean exists(CertificateId id);
}