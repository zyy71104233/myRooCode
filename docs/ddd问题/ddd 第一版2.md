# DDD证书管理系统问题与解决方案全集

## 1. 构建与配置问题

### 1.1 Java版本兼容性问题

**现象**：

- 编译错误：找不到String.isBlank()方法
- 虽然pom.xml配置了Java 17，但编译器未正确识别Java 11+特性

**解决方案**：

```java
// 原代码
if (publicKey == null || publicKey.isBlank())

// 修改后
if (publicKey == null || publicKey.trim().isEmpty())
```

**预防手段**：

```xml
<properties>
  <java.version>17</java.version>
</properties>
```

### 1.2 Maven构建配置问题

**现象**：

- 初始pom.xml配置不完整导致构建失败
- 包括：缺少必要的依赖、插件配置不正确等

**解决方案**：

- 添加Spring Boot父POM
- 配置正确的Java版本
- 添加mysql-connector-java等必要依赖
- 配置maven-compiler-plugin

### 1.3 MyBatis版本冲突

**现象**：

- MyBatis 3.5.15与Spring Boot 2.7.18集成时出现Mapper扫描失败

**解决方案**：

```xml
<dependency>
  <groupId>org.mybatis.spring.boot</groupId>
  <artifactId>mybatis-spring-boot-starter</artifactId>
  <version>2.3.1</version>
</dependency>
```

## 2. 领域层问题

### 2.1 聚合根状态管理

**现象**：

- Certificate状态变更缺少业务规则校验
- 状态转换混乱

**解决方案**：

```java
// 状态模式实现
public class Certificate {
    private CertificateState state = new DraftState();

    public void deploy() {
        state = state.deploy();
    }
}
```

### 2.2 值对象设计

**现象**：

- CertificateContent值对象序列化异常
- 密钥对验证不充分

**解决方案**：

```java
public class CertificateContent {
    private void validateKeys(String publicKey, String privateKey) {
        if (!publicKey.startsWith("-----BEGIN PUBLIC KEY-----")) {
            throw new InvalidCertificateKeyException();
        }
    }
}
```

## 3. 持久层问题

### 3.1 MyBatis映射问题

**现象**：

- Mapper XML文件未被正确加载
- 嵌套对象映射失败

**解决方案**：

```yaml
# application.yml
mybatis:
    mapper-locations: classpath*:mapper/**/*.xml
```

```xml
<!-- Mapper配置示例 -->
<resultMap id="certificateMap" type="Certificate">
  <association property="content" resultMap="contentMap"/>
</resultMap>
```

### 3.2 乐观锁问题

**现象**：

- 并发更新时出现数据覆盖

**解决方案**：

```java
public class Certificate {
    @Version
    private Long version;
}
```

## 4. 应用层问题

### 4.1 事务管理

**现象**：

- 跨聚合操作出现部分成功

**解决方案**：

```java
@Transactional
public CertificateId createCertificate(CreateCertificateCommand cmd) {
    // 业务逻辑
}
```

### 4.2 服务调用顺序

**现象**：

- 领域服务调用顺序导致业务异常

**解决方案**：

```java
public void deployCertificate(DeployCertificateCommand cmd) {
    // 1. 验证证书状态
    // 2. 调用领域服务
    // 3. 保存状态
}
```

## 5. 接口层问题

### 5.1 DTO转换

**现象**：

- Controller中存在大量重复的DTO转换逻辑

**解决方案**：

```java
@Mapper(componentModel = "spring")
public interface CertificateMapper {
    CertificateDTO toDTO(Certificate certificate);
}
```

### 5.2 异常处理

**现象**：

- API错误响应格式不一致

**解决方案**：

```java
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(CertificateNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound() {
        return ResponseEntity.notFound().build();
    }
}
```

## 6. 测试问题

### 6.1 数据污染

**现象**：

- 测试用例间相互影响

**解决方案**：

```java
@SpringBootTest
@Transactional
@Rollback
class CertificateServiceTest {
    // 测试方法
}
```

### 6.2 测试配置

**现象**：

- 测试类无法加载应用上下文

**解决方案**：

```java
@TestConfiguration
@ActiveProfiles("test")
public class TestConfig {
    // 测试专用配置
}
```

## 7. 数据库问题

### 7.1 连接配置

**现象**：

- 测试环境数据库连接失败

**解决方案**：

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/certificate_test?allowPublicKeyRetrieval=true&useSSL=false
```

### 7.2 索引问题

**现象**：

- schema.sql中的索引长度超过MySQL限制

**解决方案**：

```sql
ALTER TABLE certificates
MODIFY COLUMN public_key TEXT,
ADD UNIQUE INDEX idx_public_key (public_key(255));
```

## 总结表

| 问题类型 | 关键问题       | 解决状态  | 预防手段    |
| -------- | -------------- | --------- | ----------- |
| 构建配置 | Java版本兼容性 | ✅ 已解决 | 明确pom配置 |
| 领域模型 | 聚合根状态管理 | ✅ 已解决 | 状态模式    |
| 持久层   | MyBatis映射    | ✅ 已解决 | 统一配置    |
| 应用层   | 事务管理       | ✅ 已解决 | 注解控制    |
| 接口层   | DTO转换        | ✅ 已解决 | MapStruct   |
| 测试     | 数据污染       | ✅ 已解决 | 事务回滚    |
