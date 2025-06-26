package com.example.certificate.domain.service;

import com.example.certificate.domain.model.Certificate;
import com.example.certificate.domain.model.CertificateType;
import com.example.certificate.domain.model.IssuanceRecord;

import java.time.LocalDate;
import java.util.List;

public interface CertificateQueryService {
    Certificate findById(Long id);
    Certificate findByNumber(String certificateNumber);
    List<Certificate> findAll(int offset, int limit);
    List<Certificate> findByExpiryDateBetween(LocalDate start, LocalDate end);
    List<CertificateType> findAllCertificateTypes();
    List<IssuanceRecord> findIssuanceRecordsByCertificate(Long certificateId);
}