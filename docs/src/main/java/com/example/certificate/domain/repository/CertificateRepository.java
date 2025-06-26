package com.example.certificate.domain.repository;

import com.example.certificate.domain.model.Certificate;
import java.util.List;
import java.util.Optional;

public interface CertificateRepository {
    Optional<Certificate> findById(Long id);
    Certificate save(Certificate certificate);
    Optional<Certificate> findByCertificateNumber(String certificateNumber);
    boolean existsByCertificateNumber(String certificateNumber);
    List<Certificate> findAll(int offset, int limit);
}