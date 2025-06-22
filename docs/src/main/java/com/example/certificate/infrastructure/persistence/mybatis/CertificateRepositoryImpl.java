package com.example.certificate.infrastructure.persistence.mybatis;

import com.example.certificate.domain.model.Certificate;
import com.example.certificate.domain.model.CertificateId;
import com.example.certificate.domain.repository.CertificateRepository;
import com.example.certificate.infrastructure.persistence.mybatis.mapper.CertificateMapper;
import java.util.Optional;

public class CertificateRepositoryImpl implements CertificateRepository {
    private final CertificateMapper certificateMapper;

    public CertificateRepositoryImpl(CertificateMapper certificateMapper) {
        this.certificateMapper = certificateMapper;
    }


    @Override
    public void delete(CertificateId certificateId) {
        certificateMapper.delete(certificateId);
    }
    @Override
    public boolean exists(CertificateId certificateId) {
        return certificateMapper.exists(certificateId);
    }

    @Override
    public Optional<Certificate> findById(CertificateId certificateId) {
        // TODO: Implement MyBatis query
        return Optional.empty();
    }

    @Override
    public Certificate save(Certificate certificate) {
        certificateMapper.save(certificate);
        return certificate;
    }
}