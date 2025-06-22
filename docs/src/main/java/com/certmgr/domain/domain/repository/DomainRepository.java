package com.certmgr.domain.domain.repository;

import com.certmgr.domain.domain.model.DomainName;
import java.util.Optional;

public interface DomainRepository {
    Optional<DomainName> findByValue(String value);
    DomainName save(DomainName domain);
    void deleteByValue(String value);
}