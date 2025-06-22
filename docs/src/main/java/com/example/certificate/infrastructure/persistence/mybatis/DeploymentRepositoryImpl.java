package com.example.certificate.infrastructure.persistence.mybatis;

import com.example.certificate.domain.model.CertificateId;
import com.example.certificate.domain.model.Deployment;
import com.example.certificate.domain.model.DeploymentId;
import com.example.certificate.domain.repository.DeploymentRepository;
import com.example.certificate.infrastructure.persistence.mybatis.mapper.DeploymentMapper;
import java.util.List;
import java.util.Optional;

public class DeploymentRepositoryImpl implements DeploymentRepository {
    private final DeploymentMapper deploymentMapper;

    public DeploymentRepositoryImpl(DeploymentMapper deploymentMapper) {
        this.deploymentMapper = deploymentMapper;
    }

    @Override
    public List<Deployment> findByEnvironment(String environment) {
        return deploymentMapper.findByEnvironment(environment);
    }
    @Override
    public void delete(DeploymentId deploymentId) {
        deploymentMapper.delete(deploymentId);
    }

    @Override
    public List<Deployment> findByCertificateId(CertificateId certificateId) {
        return deploymentMapper.findByCertificateId(certificateId);
    }

    @Override
    public Optional<Deployment> findById(DeploymentId deploymentId) {
        return deploymentMapper.findById(deploymentId);
    }

    @Override
    public Deployment save(Deployment deployment) {
        deploymentMapper.save(deployment);
        return deployment;
        // TODO: Implement MyBatis insert/update
    }
}