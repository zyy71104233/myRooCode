package com.example.certificate.application.service;

import com.example.certificate.domain.model.Certificate;
import com.example.certificate.domain.repository.CertificateRepository;
import com.example.certificate.application.dto.CertificateDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CertificateApplicationServiceTest {

    @Mock
    private CertificateRepository certificateRepository;

    @InjectMocks
    private CertificateApplicationService certificateService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldIssueCertificateSuccessfully() {
        // 准备测试数据
        CertificateDTO dto = new CertificateDTO();
        dto.setCertificateNumber("CERT-001");
        dto.setHolderName("张三");
        dto.setIssueDate(LocalDateTime.now());
        dto.setExpiryDate(LocalDateTime.now().plusYears(1));

        // 模拟仓储行为
        Certificate savedCertificate = new Certificate(
            "CERT-001",
            "张三",
            LocalDateTime.now(),
            LocalDateTime.now().plusYears(1)
        );
        savedCertificate.setId(1L);
        when(certificateRepository.save(any(Certificate.class))).thenReturn(savedCertificate);

        // 执行测试
        CertificateDTO result = certificateService.issueCertificateDTO(dto);

        // 验证结果
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("CERT-001", result.getCertificateNumber());
        verify(certificateRepository, times(1)).save(any(Certificate.class));
    }

    @Test
    void shouldThrowExceptionWhenCertificateNumberIsEmpty() {
        CertificateDTO dto = new CertificateDTO();
        dto.setCertificateNumber("");
        dto.setHolderName("李四");
        dto.setIssueDate(LocalDateTime.now());
        dto.setExpiryDate(LocalDateTime.now().plusYears(1));

        assertThrows(IllegalArgumentException.class, () -> {
            certificateService.issueCertificateDTO(dto);
        });
    }

    @Test
    void shouldThrowExceptionWhenExpiryDateBeforeIssueDate() {
        CertificateDTO dto = new CertificateDTO();
        dto.setCertificateNumber("CERT-002");
        dto.setHolderName("王五");
        dto.setIssueDate(LocalDateTime.now());
        dto.setExpiryDate(LocalDateTime.now().minusDays(1));

        assertThrows(IllegalArgumentException.class, () -> {
            certificateService.issueCertificateDTO(dto);
        });
    }

    @Test
    void shouldGetCertificateDTOSuccessfully() {
        // 准备测试数据
        Certificate certificate = new Certificate();
        certificate.setId(1L);
        certificate.setCertificateNumber("CERT-001");
        certificate.setStatus(1);
        
        // 模拟仓储行为
        when(certificateRepository.findById(1L)).thenReturn(Optional.of(certificate));

        // 执行测试
        CertificateDTO result = certificateService.getCertificateDTO(1L);

        // 验证结果
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("CERT-001", result.getCertificateNumber());
        assertEquals(1, result.getStatus());
    }

    @Test
    void shouldThrowExceptionWhenGetNonExistingCertificateDTO() {
        // 模拟仓储行为
        when(certificateRepository.findById(1L)).thenReturn(Optional.empty());

        // 执行测试并验证异常
        assertThrows(IllegalArgumentException.class, () -> {
            certificateService.getCertificateDTO(1L);
        });
    }

    @Test
    void shouldRevokeCertificateSuccessfully() {
        // 准备测试数据
        Certificate certificate = new Certificate();
        certificate.setId(1L);
        certificate.setStatus(1); // 有效状态

        // 模拟仓储行为
        when(certificateRepository.findById(1L)).thenReturn(Optional.of(certificate));
        when(certificateRepository.save(any(Certificate.class))).thenReturn(certificate);

        // 执行测试
        certificateService.revokeCertificate(1L, "测试撤销");

        // 验证结果
        verify(certificateRepository, times(1)).findById(1L);
        verify(certificateRepository, times(1)).save(argThat(c -> c.getStatus() == 0));
    }

    @Test
    void shouldThrowExceptionWhenRevokeNonExistingCertificate() {
        // 模拟仓储行为
        when(certificateRepository.findById(1L)).thenReturn(Optional.empty());

        // 执行测试并验证异常
        assertThrows(IllegalArgumentException.class, () -> {
            certificateService.revokeCertificate(1L, "测试撤销");
        });
    }
}
