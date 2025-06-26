package com.example.certificate.infrastructure.persistence.repository;

import com.example.certificate.domain.model.User;
import com.example.certificate.domain.repository.UserRepository;
import com.example.certificate.infrastructure.persistence.mapper.UserMapper;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class UserRepositoryImpl implements UserRepository {

    private final UserMapper userMapper;

    public UserRepositoryImpl(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @Override
    public Optional<User> findById(Long id) {
        return userMapper.findById(id);
    }

    @Override
    public Optional<User> findByUsername(String username) {
        return userMapper.findByUsername(username);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userMapper.findByEmail(email);
    }

    @Override
    public User save(User user) {
        if (user.getId() == null) {
            userMapper.insert(user);
        } else {
            userMapper.update(user);
        }
        return user;
    }

    @Override
    public boolean existsByUsername(String username) {
        return userMapper.findByUsername(username).isPresent();
    }

    @Override
    public boolean existsByEmail(String email) {
        return userMapper.findByEmail(email).isPresent();
    }
}