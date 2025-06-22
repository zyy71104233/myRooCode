package com.certmgr.domain.infrastructure.persistence.mybatis;

import com.certmgr.domain.domain.model.DomainName;
import org.apache.ibatis.annotations.Mapper;

import java.util.Optional;

@Mapper
public interface DomainMapper {
    Optional<DomainName> findByValue(String value);
    DomainName save(DomainName domainName);
    int deleteByValue(String value);
}