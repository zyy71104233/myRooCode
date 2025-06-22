---
description:
globs:
alwaysApply: false
---

### **一. 架构审查确认**

- **核心价值**: 本上下文的核心价值在于，为系统提供安全可靠的证书管理能力，确保域名与证书的合规绑定。
- **架构模式**: 采用CQRS-Lite模式。命令侧由`CertificateApplicationService`编排，通过`CertificateRepository`与聚合根交互；查询侧由`CertificateQueryService`直接读取数据。
- **简化机会**:
    - **建议**: 设计中的`CertificateValidationService`在初期可能只是一个简单的验证函数。建议暂时实现为`Certificate`聚合根的私有方法。

### **二. 项目初始化**

- [ ] **步骤 1: 创建目录结构**

```bash
mkdir -p src/main/java/com/example/certificate/{application,domain,infrastructure,interfaces}
mkdir -p src/test/java/com/example/certificate/{application,domain,infrastructure,interfaces}
```

- [ ] **步骤 2: 创建基础文件**

```bash
touch src/main/java/com/example/certificate/domain/model/{Certificate.java,CertificateContent.java}
touch src/test/java/com/example/certificate/domain/model/{CertificateTest.java,CertificateContentTest.java}
```

### **三. 实现清单**

#### **阶段一：领域层 (Domain Layer)**

- [ ] **步骤 3.1: CertificateContent值对象**

    - [ ] **[TEST]:** 基础验证测试

    ```java
    class CertificateContentTest {
        @Test void should_throw_when_public_key_invalid() {}
        @Test void should_create_when_keys_valid() {}
    }
    ```

    - [ ] **[CODE]:** 核心实现

    ```java
    public class CertificateContent {
        private final String publicKey;
        private final String privateKey;

        public CertificateContent(String publicKey, String privateKey) {
            validateKeys(publicKey, privateKey);
            this.publicKey = publicKey;
            this.privateKey = privateKey;
        }
    }
    ```

- [ ] **步骤 3.2: Certificate聚合根**
    - [ ] **[TEST]:** 状态转换测试
    ```java
    class CertificateTest {
        @Test void should_allow_deploy_when_active() {}
        @Test void should_throw_when_deploy_expired() {}
    }
    ```
    - [ ] **[CODE]:** 核心行为
    ```java
    public class Certificate {
        public void deploy() {
            if (isExpired()) {
                throw new CertificateExpiredException();
            }
            this.status = CertificateStatus.DEPLOYED;
        }
    }
    ```

#### **阶段二：基础设施层 (Infrastructure Layer)**

- [ ] **步骤 4.1: MyBatis映射**
    - [ ] **[TEST]:** 数据库操作测试
    ```java
    @MybatisTest
    class CertificateMapperTest {
        @Test void should_insert_certificate() {}
    }
    ```
    - [ ] **[CODE]:** Mapper接口
    ```java
    @Mapper
    public interface CertificateMapper {
        @Insert("INSERT INTO certificates(...) VALUES(...)")
        void insert(Certificate certificate);
    }
    ```

#### **阶段三：应用层 (Application Layer)**

- [ ] **步骤 5.1: 创建证书用例**
    - [ ] **[TEST]:** 服务集成测试
    ```java
    @SpringBootTest
    class CertificateServiceTest {
        @Test void should_create_certificate() {}
    }
    ```
    - [ ] **[CODE]:** 应用服务
    ```java
    @Service
    public class CertificateService {
        public CertificateId create(CreateCertificateCommand cmd) {
            Certificate cert = Certificate.create(cmd.getContent());
            repository.save(cert);
            return cert.getId();
        }
    }
    ```

#### **阶段四：接口层 (Interface Layer)**

- [ ] **步骤 6.1: REST API**
    - [ ] **[TEST]:** API契约测试
    ```java
    @WebMvcTest
    class CertificateControllerTest {
        @Test void should_return_201_when_create_success() {}
    }
    ```
    - [ ] **[CODE]:** 控制器
    ```java
    @RestController
    @RequestMapping("/certificates")
    public class CertificateController {
        @PostMapping
        public ResponseEntity<?> createCertificate(@Valid @RequestBody CreateCertificateRequest request) {
            CertificateId id = service.create(request.toCommand());
            return ResponseEntity.created(URI.create("/certificates/" + id)).build();
        }
    }
    ```

### **四. 技术栈配置**

- [ ] **技术栈说明**

    - **核心框架**:
        - Spring Boot 2.7.18 (Web MVC + Validation)
        - Java 8语言级别
        - UTF-8编码标准
    - **数据持久化**:
        - MyBatis 3.5.15 + MyBatis Spring Boot Starter 2.3.1
        - MySQL Connector 8.0.33
        - 显式排除H2数据库
    - **开发工具**:
        - Lombok 1.16.20 (可选依赖)
        - Maven编译插件 3.8.1
    - **测试框架**:
        - Spring Boot Test (单元/集成测试)
        - MyBatis Test (数据库测试)
    - **架构特点**:
        - 轻量级持久层方案(MyBatis+MySQL)
        - 传统Spring MVC架构
        - 完整的测试支持

- [ ] **步骤 7: MyBatis配置**

    - [ ] **[CONFIG]:** 配置MyBatis映射文件和Spring集成
        - **文件**: `src/main/resources/mybatis-config.xml`
        - **要点**: 类型别名，Mapper扫描
    - [ ] **[TEST]:** 测试数据库连接
        - **策略**: 使用Testcontainers验证MySQL连接

- [ ] **步骤 8: 生产环境配置**
    - [ ] **[CONFIG]:** 配置生产环境MySQL连接池
        - **文件**: `src/main/resources/application-prod.properties`
        - **要点**: 连接池参数，超时设置
