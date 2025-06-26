package com.example.certificate.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private Long id;
    private String username;
    private String email;
    private String department;
    public User(String username, String email, String department) {
        this.username = username;
        this.email = email;
        this.department = department;
    }
}