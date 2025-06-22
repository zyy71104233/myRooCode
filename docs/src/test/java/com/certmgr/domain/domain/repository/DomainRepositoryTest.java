package com.certmgr.domain.domain.repository;

import com.certmgr.domain.domain.model.DomainName;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;

public interface DomainRepositoryTest<T extends DomainRepository> {

    T createRepository();

    @Test
    default void shouldSaveAndRetrieveDomain() {
        DomainRepository repository = createRepository();
        DomainName domain = new DomainName("example.com");
        
        DomainName saved = repository.save(domain);
        Optional<DomainName> found = repository.findByValue(saved.getValue());
        
        assertTrue(found.isPresent());
        assertEquals(saved, found.get());
    }

    @Test
    default void shouldReturnEmptyWhenNotFound() {
        DomainRepository repository = createRepository();
        Optional<DomainName> found = repository.findByValue("nonexistent.com");
        assertFalse(found.isPresent());
    }

    @Test
    default void shouldDeleteDomain() {
        DomainRepository repository = createRepository();
        DomainName domain = new DomainName("example.com");
        DomainName saved = repository.save(domain);
        
        repository.deleteByValue(saved.getValue());
        Optional<DomainName> found = repository.findByValue(saved.getValue());
        
        assertFalse(found.isPresent());
    }
}