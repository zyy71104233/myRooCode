package com.example.certificate.domain.repository;

import com.example.certificate.domain.model.Deployment;
import com.example.certificate.domain.model.DeploymentId;
import com.example.certificate.domain.model.CertificateId;
import java.util.List;
import java.util.Optional;

public interface DeploymentRepository {
    Optional<Deployment> findById(DeploymentId id);
    List<Deployment> findByCertificateId(CertificateId certificateId);
    List<Deployment> findByEnvironment(String environment);
    Deployment save(Deployment deployment);
    void delete(DeploymentId id);
}