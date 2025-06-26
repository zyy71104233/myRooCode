package com.example.certificate.interfaces.rest;

import com.example.certificate.application.dto.CertificateDTO;
import com.example.certificate.application.service.CertificateApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {

    private final CertificateApplicationService certificateService;

    public CertificateController(CertificateApplicationService certificateService) {
        this.certificateService = certificateService;
    }

    @PostMapping
    public CertificateDTO issueCertificate(@RequestBody CertificateDTO dto) {
        return certificateService.issueCertificateDTO(dto);
    }

    @PostMapping("/{id}/revoke")
    public void revokeCertificate(@PathVariable Long id, @RequestParam String reason) {
        certificateService.revokeCertificate(id, reason);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CertificateDTO> getCertificate(@PathVariable Long id) {
        try {
            CertificateDTO dto = certificateService.getCertificateDTO(id);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}