package com.certmgr.domain.domain.model;

import lombok.Value;

@Value
public class DomainName {
    String value;

    public DomainName(String value) {
        validateDomainName(value);
        this.value = normalizeDomainName(value);
    }

    private void validateDomainName(String domain) {
        if (domain == null || domain.isEmpty()) {
            throw new IllegalArgumentException("Domain name cannot be empty");
        }
        
        if (!domain.matches("^(?!-)[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*(\\.[A-Za-z]{2,})$")) {
            throw new IllegalArgumentException("Invalid domain name format");
        }
    }

    private String normalizeDomainName(String domain) {
        return domain.toLowerCase();
    }
}