package com.example.certificate.infrastructure.persistence.repository;

import com.example.certificate.domain.model.Certificate;
import com.example.certificate.domain.repository.CertificateRepository;
import com.example.certificate.infrastructure.persistence.mapper.CertificateMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class CertificateRepositoryImpl implements CertificateRepository {
    
    private final CertificateMapper certificateMapper;

    public CertificateRepositoryImpl(CertificateMapper certificateMapper) {
        this.certificateMapper = certificateMapper;
    }

    @Override
    public Optional<Certificate> findById(Long id) {
        return Optional.ofNullable(certificateMapper.findById(id));
    }

    @Override
    public Optional<Certificate> findByCertificateNumber(String certificateNumber) {
        return Optional.ofNullable(certificateMapper.findByNumber(certificateNumber));
    }

    @Override
    public Certificate save(Certificate certificate) {
        if (certificate.getId() == null) {
            certificateMapper.insert(certificate);
        } else {
            certificateMapper.update(certificate);
        }
        return certificate;
    }

    @Override
    public boolean existsByCertificateNumber(String certificateNumber) {
        return certificateMapper.findByNumber(certificateNumber) != null;
    }

    @Override
    public List<Certificate> findAll(int offset, int limit) {
        return certificateMapper.findAll(offset, limit);
    }
}