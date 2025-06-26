package com.example.certificate.infrastructure.persistence.repository;

import com.example.certificate.domain.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = com.example.certificate.CertificateManagementApplication.class)
@Transactional
class UserRepositoryImplTest {

    @Autowired
    private UserRepositoryImpl userRepository;

    @Test
    void shouldSaveAndFindUserById() {
        User user = new User("testuser", "test@example.com", "IT");
        User savedUser = userRepository.save(user);
        
        Optional<User> foundUser = userRepository.findById(savedUser.getId());
        assertTrue(foundUser.isPresent());
        assertEquals(savedUser.getUsername(), foundUser.get().getUsername());
    }

    @Test
    void shouldFindUserByUsername() {
        User user = new User("testuser", "test@example.com", "Finance");
        userRepository.save(user);
        
        Optional<User> foundUser = userRepository.findByUsername("testuser");
        assertTrue(foundUser.isPresent());
    }

    @Test
    void shouldFindUserByEmail() {
        User user = new User("testuser", "test@example.com", "HR");
        userRepository.save(user);
        
        Optional<User> foundUser = userRepository.findByEmail("test@example.com");
        assertTrue(foundUser.isPresent());
    }

    @Test
    void shouldCheckUsernameExists() {
        User user = new User("testuser", "test@example.com", "Operations");
        userRepository.save(user);
        
        assertTrue(userRepository.existsByUsername("testuser"));
        assertFalse(userRepository.existsByUsername("nonexistent"));
    }

    @Test
    void shouldCheckEmailExists() {
        User user = new User("testuser", "test@example.com", "Marketing");
        userRepository.save(user);
        
        assertTrue(userRepository.existsByEmail("test@example.com"));
        assertFalse(userRepository.existsByEmail("nonexistent@example.com"));
    }
}