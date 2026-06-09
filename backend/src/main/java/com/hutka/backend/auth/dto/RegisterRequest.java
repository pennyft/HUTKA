package com.hutka.backend.auth.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String phone;
    private String password;
    private String firstName;
    private String lastName;
    private String dateOfBirth;
}