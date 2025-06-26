package com.example.certificate.application.service;

import com.example.certificate.domain.model.Certificate;
import com.example.certificate.domain.model.CertificateType;
import com.example.certificate.domain.model.IssuanceRecord;
import com.example.certificate.domain.model.User;
import com.example.certificate.domain.repository.CertificateRepository;
import com.example.certificate.domain.repository.CertificateTypeRepository;
import com.example.certificate.domain.service.CertificateService;
import com.example.certificate.application.dto.CertificateDTO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CertificateApplicationService implements CertificateService {

    private final CertificateRepository certificateRepository;
    private final CertificateTypeRepository certificateTypeRepository;

    public CertificateApplicationService(
        CertificateRepository certificateRepository,
        CertificateTypeRepository certificateTypeRepository
    ) {
        this.certificateRepository = certificateRepository;
        this.certificateTypeRepository = certificateTypeRepository;
    }

    @Override
    public Certificate createCertificate(Certificate certificate) {
        return certificateRepository.save(certificate);
    }

    public Certificate createCertificateFromDTO(CertificateDTO certificateDTO) {
        Certificate certificate = new Certificate();
        if (certificateDTO.getType() != null) {
            CertificateType certificateType = certificateTypeRepository.findByName(certificateDTO.getType())
                .orElseThrow(() -> new IllegalArgumentException("无效的证书类型"));
            certificate.setType(certificateType);
        }
        certificate.setTitle(certificateDTO.getTitle());
        certificate.setContent(certificateDTO.getContent());
        return certificateRepository.save(certificate);
    }

    @Override
    public Certificate updateCertificate(Certificate certificate) {
        return certificateRepository.save(certificate);
    }

    @Override
    public void revokeCertificate(Long certificateId, String reason) {
        Certificate certificate = certificateRepository.findById(certificateId)
            .orElseThrow(() -> new IllegalArgumentException("证书不存在"));
        certificate.setStatus(0); // 0表示已撤销
        certificateRepository.save(certificate);
    }

    @Override
    public IssuanceRecord issueCertificate(Certificate certificate, User user, User issuer) {
        // TODO: 实现证书签发逻辑
        return null;
    }

    @Override
    public CertificateType createCertificateType(CertificateType type) {
        // TODO: 实现证书类型创建逻辑
        return null;
    }

    @Override
    public CertificateDTO getCertificateDTO(Long certificateId) {
        Certificate certificate = certificateRepository.findById(certificateId)
            .orElseThrow(() -> new IllegalArgumentException("证书不存在"));
        return convertToDTO(certificate);
    }

    public CertificateDTO issueCertificateDTO(CertificateDTO certificateDTO) {
        validateCertificateDTO(certificateDTO);
        Certificate certificate = new Certificate(
            certificateDTO.getCertificateNumber(),
            certificateDTO.getHolderName(),
            certificateDTO.getIssueDate(),
            certificateDTO.getExpiryDate()
        );
        if (certificateDTO.getType() != null) {
            CertificateType certificateType = certificateTypeRepository.findByName(certificateDTO.getType())
                .orElseThrow(() -> new IllegalArgumentException("无效的证书类型"));
            certificate.setType(certificateType);
        }
        certificate.setTitle(certificateDTO.getTitle());
        certificate.setContent(certificateDTO.getContent());
        
        Certificate issuedCertificate = certificateRepository.save(certificate);
        return convertToDTO(issuedCertificate);
    }

    private void validateCertificateDTO(CertificateDTO certificateDTO) {
        if (certificateDTO.getCertificateNumber() == null || certificateDTO.getCertificateNumber().isEmpty()) {
            throw new IllegalArgumentException("证书编号不能为空");
        }
        if (certificateDTO.getExpiryDate().isBefore(certificateDTO.getIssueDate())) {
            throw new IllegalArgumentException("过期日期不能早于签发日期");
        }
    }

    private Certificate convertToDomain(CertificateDTO dto) {
        Certificate certificate = new Certificate();
        certificate.setCertificateNumber(dto.getCertificateNumber());
        certificate.setHolderName(dto.getHolderName());
        certificate.setIssueDate(dto.getIssueDate());
        certificate.setExpiryDate(dto.getExpiryDate());
        return certificate;
    }

    private CertificateDTO convertToDTO(Certificate certificate) {
        CertificateDTO dto = new CertificateDTO();
        dto.setId(certificate.getId());
        dto.setCertificateNumber(certificate.getCertificateNumber());
        dto.setHolderName(certificate.getHolderName());
        dto.setIssueDate(certificate.getIssueDate());
        dto.setExpiryDate(certificate.getExpiryDate());
        dto.setStatus(certificate.getStatus());
        return dto;
    }
}