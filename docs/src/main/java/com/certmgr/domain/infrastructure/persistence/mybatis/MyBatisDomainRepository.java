package com.certmgr.domain.infrastructure.persistence.mybatis;

import com.certmgr.domain.domain.model.DomainName;
import com.certmgr.domain.domain.repository.DomainRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class MyBatisDomainRepository implements DomainRepository {

    private final DomainMapper domainMapper;

    public MyBatisDomainRepository(DomainMapper domainMapper) {
        this.domainMapper = domainMapper;
    }

    @Override
    public Optional<DomainName> findByValue(String value) {
        return domainMapper.findByValue(value);
    }

    @Override
    public DomainName save(DomainName domainName) {
        return domainMapper.save(domainName);
    }

    @Override
    public void deleteByValue(String value) {
        domainMapper.deleteByValue(value);
    }
}