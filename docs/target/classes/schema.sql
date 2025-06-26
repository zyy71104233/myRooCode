-- 证书类型表
CREATE TABLE IF NOT EXISTS certificate_types (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(100) NOT NULL COMMENT '证书类型名称',
    description VARCHAR(500) COMMENT '类型描述',
    validity_period INT COMMENT '有效期(天)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_type_name (type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='证书类型表';

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    email VARCHAR(100) NOT NULL COMMENT '邮箱',
    department VARCHAR(100) COMMENT '部门',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 证书表
CREATE TABLE IF NOT EXISTS certificates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    certificate_number VARCHAR(50) NOT NULL COMMENT '证书编号',
    type_id BIGINT NOT NULL COMMENT '证书类型ID',
    title VARCHAR(200) NOT NULL COMMENT '证书标题',
    content TEXT COMMENT '证书内容',
    status TINYINT DEFAULT 1 COMMENT '状态:1-有效,0-无效',
    issue_date DATE COMMENT '颁发日期',
    expiry_date DATE COMMENT '过期日期',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES certificate_types(id),
    UNIQUE KEY uk_certificate_number (certificate_number),
    KEY idx_status (status),
    KEY idx_expiry_date (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='证书表';

-- 颁发记录表
CREATE TABLE IF NOT EXISTS issuance_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    certificate_id BIGINT NOT NULL COMMENT '证书ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    issuer_id BIGINT NOT NULL COMMENT '颁发人ID',
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '颁发时间',
    revoke_reason VARCHAR(500) COMMENT '撤销原因',
    revoked_at DATETIME COMMENT '撤销时间',
    FOREIGN KEY (certificate_id) REFERENCES certificates(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (issuer_id) REFERENCES users(id),
    KEY idx_certificate_id (certificate_id),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='证书颁发记录表';