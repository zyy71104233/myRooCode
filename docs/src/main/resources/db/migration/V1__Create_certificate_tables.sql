-- 证书表
CREATE TABLE certificates (
    id VARCHAR(36) PRIMARY KEY,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    issue_date TIMESTAMP NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    revocation_reason VARCHAR(255),
    revoked_at TIMESTAMP
);

-- 部署表
CREATE TABLE deployments (
    id VARCHAR(36) PRIMARY KEY,
    certificate_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL,
    deployed_at TIMESTAMP NOT NULL,
    FOREIGN KEY (certificate_id) REFERENCES certificates(id)
);