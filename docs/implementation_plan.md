### **一. 架构审查确认**

- **核心价值**: 本系统的核心价值在于提供一个安全可靠的证书管理平台，确保系统间通信的安全性和可信度。

- **架构模式**: 确认采用CQRS-Lite模式。

    - 命令侧：由`CertificateApplicationService`和`DomainApplicationService`编排，通过各自的Repository与聚合根交互
    - 查询侧：由`CertificateQueryService`和`DomainQueryService`通过各自的DAO直接读取数据

- **简化机会**:
    - **建议1**: `CertificateContent`的验证逻辑初期可以是简单的格式检查，不需要创建独立的验证服务。
    - **建议2**: `Domain`聚合根中的证书关联管理初期可以用简单的Set实现，不需要复杂的关联管理机制。
    - **建议3**: 初期的部署配置可以使用简单的配置对象，不需要创建复杂的策略模式。

### **二. 项目初始化**

- [ ] **步骤 1: 创建Maven项目结构**

```bash
mkdir -p src/main/java/com/certmgr/{certificate,domain}/{application,domain,infrastructure}
mkdir -p src/test/java/com/certmgr/{certificate,domain}/{application,domain,infrastructure}
```

- [ ] **步骤 2: 配置基础依赖**
    - [ ] 创建`pom.xml`，添加以下依赖：
        - Spring Boot Starter
        - Spring Data JPA
        - H2 Database (开发环境)
        - PostgreSQL (生产环境)
        - Lombok
        - JUnit 5
        - Mockito
        - AssertJ

### **三. 实现清单**

#### **阶段一：领域层 (Domain Layer) - 单元测试驱动**

- [ ] **步骤 3: Certificate Context - 值对象**

    - [ ] **[CODE]:** 实现`CertificateContent`值对象
        - **文件**: `certificate/domain/model/CertificateContent.java`
    - [ ] **[TEST]:** 编写`CertificateContent`单元测试
        - **文件**: `certificate/domain/model/CertificateContentTest.java`
        - **用例**:
            - 有效的证书内容创建
            - 无效的公钥格式
            - 无效的私钥格式
            - 无效的证书链

- [ ] **步骤 4: Domain Context - 值对象**

    - [ ] **[CODE]:** 实现`DomainName`值对象
        - **文件**: `domain/domain/model/DomainName.java`
    - [ ] **[TEST]:** 编写`DomainName`单元测试
        - **文件**: `domain/domain/model/DomainNameTest.java`
        - **用例**:
            - 有效的域名格式
            - 无效的域名格式
            - 大小写转换
            - 特殊字符处理

- [ ] **步骤 5: Certificate Context - 聚合根**

    - [ ] **[CODE]:** 实现`Certificate`聚合根核心方法
        - **文件**: `certificate/domain/model/Certificate.java`
    - [ ] **[TEST]:** 编写`Certificate`单元测试
        - **文件**: `certificate/domain/model/CertificateTest.java`
        - **用例**:
            - 创建证书
            - 部署证书
            - 下架证书
            - 状态转换验证

- [ ] **步骤 6: Domain Context - 聚合根**
    - [ ] **[CODE]:** 实现`Domain`聚合根核心方法
        - **文件**: `domain/domain/model/Domain.java`
    - [ ] **[TEST]:** 编写`Domain`单元测试
        - **文件**: `domain/domain/model/DomainTest.java`
        - **用例**:
            - 创建域名
            - 更新域名
            - 添加证书关联
            - 删除验证

#### **阶段二：基础设施层 (Infrastructure Layer) - 集成测试驱动**

- [ ] **步骤 7: Certificate Context - 仓储实现**

    - [ ] **[CODE]:** 实现`JpaCertificateRepository`
        - **文件**: `certificate/infrastructure/persistence/JpaCertificateRepository.java`
    - [ ] **[TEST]:** 编写仓储集成测试
        - **文件**: `certificate/infrastructure/persistence/JpaCertificateRepositoryTest.java`
        - **策略**: 使用`@DataJpaTest`和H2数据库
        - **用例**:
            - 保存证书
            - 查找证书
            - 更新证书状态

- [ ] **步骤 8: Domain Context - 仓储实现**
    - [ ] **[CODE]:** 实现`JpaDomainRepository`
        - **文件**: `domain/infrastructure/persistence/JpaDomainRepository.java`
    - [ ] **[TEST]:** 编写仓储集成测试
        - **文件**: `domain/infrastructure/persistence/JpaDomainRepositoryTest.java`
        - **用例**:
            - 保存域名
            - 查找域名
            - 检查域名存在性

#### **阶段三：应用层 (Application Layer) - Mock辅助的集成测试驱动**

- [ ] **步骤 9: Certificate Context - 应用服务**

    - [ ] **[CODE]:** 实现`CertificateApplicationService`
        - **文件**: `certificate/application/service/CertificateApplicationService.java`
    - [ ] **[TEST]:** 编写应用服务测试
        - **文件**: `certificate/application/service/CertificateApplicationServiceTest.java`
        - **策略**: 使用Mockito mock仓储和事件发布
        - **用例**:
            - 创建证书成功流程
            - 部署证书成功流程
            - 域名验证失败
            - 证书状态验证失败

- [ ] **步骤 10: Domain Context - 应用服务**
    - [ ] **[CODE]:** 实现`DomainApplicationService`
        - **文件**: `domain/application/service/DomainApplicationService.java`
    - [ ] **[TEST]:** 编写应用服务测试
        - **文件**: `domain/application/service/DomainApplicationServiceTest.java`
        - **用例**:
            - 创建域名成功流程
            - 更新域名成功流程
            - 域名已存在
            - 删除有证书关联的域名

### **四. 交付里程碑**

1. **M1 - 基础设施就绪** (步骤1-2)

    - 项目结构搭建完成
    - 依赖配置完成
    - 基础配置就绪

2. **M2 - 领域模型完成** (步骤3-6)

    - 值对象实现完成
    - 聚合根实现完成
    - 领域事件定义完成

3. **M3 - 持久化层完成** (步骤7-8)

    - 仓储实现完成
    - 数据访问层完成
    - 集成测试完成

4. **M4 - 应用服务完成** (步骤9-10)
    - 应用服务实现完成
    - 业务用例测试完成
    - 系统集成测试完成
