package com.example.certificate.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CertificateType {
    private Long id;
    private String typeName;
    private String description;
    private Integer validityPeriod;
}