package com.certmgr.domain.domain.model;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class DomainNameTest {
    @Test
    void shouldCreateWithValidDomain() {
        assertThatCode(() -> new DomainName("example.com"))
            .doesNotThrowAnyException();
            
        assertThatCode(() -> new DomainName("sub.example.com"))
            .doesNotThrowAnyException();
    }

    @Test
    void shouldRejectInvalidDomain() {
        assertThatThrownBy(() -> new DomainName(""))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("cannot be empty");

        assertThatThrownBy(() -> new DomainName("example..com"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Invalid domain name format");
    }

    @Test
    void shouldNormalizeToLowerCase() {
        DomainName domain = new DomainName("EXAMPLE.COM");
        assertThat(domain.getValue()).isEqualTo("example.com");
    }

    @Test
    void shouldHandleSpecialCharacters() {
        assertThatCode(() -> new DomainName("exa-mple.com"))
            .doesNotThrowAnyException();
    }
}