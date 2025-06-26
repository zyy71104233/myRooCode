package com.example.certificate.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Certificate {
    private static final AtomicInteger counter = new AtomicInteger(1);
    private Long id;
    private String certificateNumber;
    private CertificateType type;
    private String title;
    private String content;
    private String holderName;
    private Integer status;
    private LocalDateTime issueDate;
    private LocalDateTime expiryDate; 

    public Certificate(String holderName, LocalDateTime issueDate, LocalDateTime expiryDate) {
        this(null, holderName, issueDate, expiryDate);
    }

    public Certificate(String certificateNumber, String holderName, LocalDateTime issueDate, LocalDateTime expiryDate) {
        this.certificateNumber = certificateNumber != null ? certificateNumber : generateCertificateNumber();
        this.holderName = holderName;
        this.issueDate = issueDate;
        this.expiryDate = expiryDate;
        this.status = 1; // 默认有效状态
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiryDate);
    }

    private static String generateCertificateNumber() {
        return String.format("CERT-%d-%03d",
            System.currentTimeMillis() % 1000000,
            counter.getAndIncrement());
    }
}