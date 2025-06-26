package com.example.certificate.infrastructure.persistence.repository;

import com.example.certificate.domain.model.CertificateType;
import com.example.certificate.domain.repository.CertificateTypeRepository;
import com.example.certificate.infrastructure.persistence.mapper.CertificateTypeMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class CertificateTypeRepositoryImpl implements CertificateTypeRepository {

    private final CertificateTypeMapper certificateTypeMapper;

    public CertificateTypeRepositoryImpl(CertificateTypeMapper certificateTypeMapper) {
        this.certificateTypeMapper = certificateTypeMapper;
    }

    @Override
    public Optional<CertificateType> findById(Long id) {
        return Optional.ofNullable(certificateTypeMapper.findById(id));
    }

    @Override
    public List<CertificateType> findAll() {
        return certificateTypeMapper.findAll();
    }

    @Override
    public CertificateType save(CertificateType certificateType) {
        if (certificateType.getId() == null) {
            certificateTypeMapper.insert(certificateType);
        } else {
            certificateTypeMapper.update(certificateType);
        }
        return certificateType;
    }

    @Override
    public boolean existsByName(String name) {
        return certificateTypeMapper.findByTypeName(name) != null;
    }

    @Override
    public Optional<CertificateType> findByName(String name) {
        return Optional.ofNullable(certificateTypeMapper.findByTypeName(name));
    }
}