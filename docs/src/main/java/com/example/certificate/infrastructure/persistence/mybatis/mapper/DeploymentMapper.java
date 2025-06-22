package com.example.certificate.infrastructure.persistence.mybatis.mapper;

import com.example.certificate.domain.model.CertificateId;
import com.example.certificate.domain.model.Deployment;
import com.example.certificate.domain.model.DeploymentId;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;
import java.util.Optional;

@Mapper
public interface DeploymentMapper {
    List<Deployment> findByEnvironment(String environment);
    void delete(DeploymentId deploymentId);
    List<Deployment> findByCertificateId(CertificateId certificateId);
    Optional<Deployment> findById(DeploymentId deploymentId);
    void save(Deployment deployment);
}