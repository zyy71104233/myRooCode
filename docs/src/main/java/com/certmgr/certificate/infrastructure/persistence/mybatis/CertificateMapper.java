package com.certmgr.certificate.infrastructure.persistence.mybatis;

import com.certmgr.certificate.domain.model.CertificateContent;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Optional;

@Mapper
public interface CertificateMapper {
    Optional<CertificateContent> findByPublicKey(@Param("publicKey") String publicKey);
    CertificateContent save(@Param("certificate") CertificateContent certificate);
    int deleteByPublicKey(@Param("publicKey") String publicKey);
}