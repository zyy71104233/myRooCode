package com.example.certificate.domain.repository;

import com.example.certificate.domain.model.CertificateType;
import java.util.List;
import java.util.Optional;

public interface CertificateTypeRepository {
    Optional<CertificateType> findById(Long id);
    List<CertificateType> findAll();
    CertificateType save(CertificateType certificateType);
    boolean existsByName(String name);
    Optional<CertificateType> findByName(String name);
}