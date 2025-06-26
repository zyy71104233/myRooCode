package com.example.certificate.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class IssuanceRecord {
    private Long id;
    private Certificate certificate;
    private User user;
    private User issuer;
    private LocalDateTime issuedAt;
    private String revokeReason;
    private LocalDateTime revokedAt;
}