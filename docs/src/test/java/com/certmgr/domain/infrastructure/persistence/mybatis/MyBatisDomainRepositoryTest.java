package com.certmgr.domain.infrastructure.persistence.mybatis;

import com.certmgr.domain.domain.model.DomainName;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

@MybatisTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = com.certmgr.CertificateManagementApplication.class)
@TestPropertySource("classpath:application-test.properties")
class MyBatisDomainRepositoryTest {

    private static final String TEST_DOMAIN = "valid.example.com";

    @Autowired
    private DomainMapper domainMapper;

    @Test
    void shouldSaveAndFindDomain() {
        DomainName domain = new DomainName(TEST_DOMAIN);
        
        domainMapper.save(domain);
        Optional<DomainName> found = domainMapper.findByValue(TEST_DOMAIN);
        
        assertTrue(found.isPresent());
        assertThat(found.get().getValue()).isEqualTo(TEST_DOMAIN.toLowerCase());
    }

    @Test
    void shouldDeleteDomain() {
        DomainName domain = new DomainName(TEST_DOMAIN);
        
        domainMapper.save(domain);
        domainMapper.deleteByValue(TEST_DOMAIN);
        
        Optional<DomainName> found = domainMapper.findByValue(TEST_DOMAIN);
        assertFalse(found.isPresent());
    }
}