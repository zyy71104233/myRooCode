package com.example.certificate.domain.model;

import lombok.Value;
import java.util.UUID;

@Value
public class DeploymentId {
    private final UUID value;

    public DeploymentId(UUID value) {
        if (value == null) {
            throw new IllegalArgumentException("Deployment ID cannot be null");
        }
        this.value = value;
    }

    public DeploymentId(String value) {
        this(UUID.fromString(value));
    }

    public static DeploymentId generate() {
        return new DeploymentId(UUID.randomUUID());
    }

    @Override
    public String toString() {
        return value.toString();
    }
}