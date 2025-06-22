package com.certmgr.certificate.domain.repository;

import com.certmgr.certificate.domain.model.CertificateContent;
import java.util.Optional;

public interface CertificateRepository {
    Optional<CertificateContent> findByPublicKey(String publicKey);
    CertificateContent save(CertificateContent certificate);
    void deleteByPublicKey(String publicKey);
}