package com.certmgr.certificate.infrastructure.persistence.mybatis;

import com.certmgr.certificate.domain.model.CertificateContent;
import com.certmgr.certificate.domain.repository.CertificateRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class MyBatisCertificateRepository implements CertificateRepository {

    private final CertificateMapper certificateMapper;

    public MyBatisCertificateRepository(CertificateMapper certificateMapper) {
        this.certificateMapper = certificateMapper;
    }

    @Override
    public Optional<CertificateContent> findByPublicKey(String publicKey) {
        return certificateMapper.findByPublicKey(publicKey);
    }

    @Override
    public CertificateContent save(CertificateContent certificate) {
        return certificateMapper.save(certificate);
    }

    @Override
    public void deleteByPublicKey(String publicKey) {
        certificateMapper.deleteByPublicKey(publicKey);
    }
}