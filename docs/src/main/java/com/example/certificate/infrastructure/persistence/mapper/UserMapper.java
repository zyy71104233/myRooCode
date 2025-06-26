package com.example.certificate.infrastructure.persistence.mapper;

import com.example.certificate.domain.model.User;
import org.apache.ibatis.annotations.*;

import java.util.Optional;

@Mapper
public interface UserMapper {
    @Insert("INSERT INTO users(username, email, department) " +
            "VALUES(#{username}, #{email}, #{department})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insert(User user);

    @Update("UPDATE users SET username=#{username}, email=#{email}, " +
            "department=#{department} WHERE id=#{id}")
    void update(User user);

    @Select("SELECT * FROM users WHERE id=#{id}")
    Optional<User> findById(Long id);

    @Select("SELECT * FROM users WHERE username=#{username}")
    Optional<User> findByUsername(String username);

    @Select("SELECT * FROM users WHERE email=#{email}")
    Optional<User> findByEmail(String email);
}