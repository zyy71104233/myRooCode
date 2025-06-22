package com.example.certificate.infrastructure.persistence.mybatis.mapper;

import com.example.certificate.domain.model.Certificate;
import com.example.certificate.domain.model.CertificateId;
import org.apache.ibatis.annotations.Mapper;
import java.util.Optional;

@Mapper
public interface CertificateMapper {
    void delete(CertificateId certificateId);
    boolean exists(CertificateId certificateId);
    Optional<Certificate> findById(CertificateId certificateId);
    void save(Certificate certificate);
}