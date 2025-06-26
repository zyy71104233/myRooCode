package com.example.certificate.interfaces.rest;

import com.example.certificate.application.service.CertificateApplicationService;
import com.example.certificate.application.dto.CertificateDTO;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
class CertificateControllerTest {

    @Mock
    private CertificateApplicationService certificateService;

    @InjectMocks
    private CertificateController certificateController;

    @Test
    void shouldGetCertificateSuccessfully() {
        // 准备测试数据
        CertificateDTO mockDTO = new CertificateDTO();
        mockDTO.setId(1L);
        mockDTO.setCertificateNumber("CERT-001");
        mockDTO.setStatus(1);
        
        // 模拟服务行为
        when(certificateService.getCertificateDTO(1L)).thenReturn(mockDTO);

        // 执行测试
        ResponseEntity<CertificateDTO> response = certificateController.getCertificate(1L);

        // 验证结果
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertEquals("CERT-001", response.getBody().getCertificateNumber());
        assertEquals(1, response.getBody().getStatus());
    }

    @Test
    void shouldReturnNotFoundWhenCertificateNotExist() {
        // 模拟服务行为
        when(certificateService.getCertificateDTO(1L))
            .thenThrow(new IllegalArgumentException("证书不存在"));

        // 执行测试并验证返回404
        ResponseEntity<CertificateDTO> response = certificateController.getCertificate(1L);
        assertEquals(404, response.getStatusCodeValue());
    }
}