# DDD实现问题与解决方案总结

## 一、技术栈配置问题

### 1. MyBatis与Spring Boot版本不兼容

**问题描述**：  
MyBatis 3.5.15与Spring Boot 2.7.18集成时出现Mapper扫描失败

**解决方案**：  
明确指定mybatis-spring-boot-starter版本为2.3.1

```xml
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>2.3.1</version>
</dependency>
```

**预防手段**：

- 使用Spring Boot官方推荐的MyBatis Starter版本
- 在项目初始化时验证依赖兼容性

### 2. Testcontainers MySQL连接失败

**问题描述**：  
Testcontainers启动的MySQL容器无法连接

**解决方案**：  
添加明确的MySQL驱动版本配置

```xml
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>8.0.33</version>
    <scope>runtime</scope>
</dependency>
```

## 二、领域层问题

### 1. 聚合根状态管理混乱

**问题描述**：  
Certificate聚合根状态转换缺少明确的业务规则验证

**解决方案**：  
实现状态模式管理状态转换

```java
public class Certificate {
    private CertificateState state = new DraftState();

    public void deploy() {
        state = state.deploy();
    }
}
```

### 2. 值对象验证不完整

**问题描述**：  
CertificateContent值对象的密钥对验证不充分

**解决方案**：  
添加完整的密钥格式验证

```java
public class CertificateContent {
    private void validateKeys(String publicKey, String privateKey) {
        if (!publicKey.startsWith("-----BEGIN PUBLIC KEY-----")) {
            throw new InvalidCertificateKeyException();
        }
        // 更多验证逻辑...
    }
}
```

## 三、基础设施层问题

### 1. MyBatis类型别名配置错误

**问题描述**：  
MyBatis无法解析领域对象的类型别名

**解决方案**：  
在mybatis-config.xml中明确配置类型别名

```xml
<typeAliases>
    <package name="com.example.certificate.domain.model"/>
</typeAliases>
```

### 2. 乐观锁实现问题

**问题描述**：  
并发更新时出现数据覆盖

**解决方案**：  
在Mapper中添加@Version注解

```java
public class Certificate {
    @Version
    private Long version;
}
```

## 四、应用层问题

### 1. 事务管理缺失

**问题描述**：  
证书创建流程不完整时出现部分更新

**解决方案**：  
在应用服务添加@Transactional

```java
@Service
@RequiredArgsConstructor
public class CertificateApplicationService {
    @Transactional
    public CertificateId createCertificate(CreateCertificateCommand command) {
        // 业务逻辑
    }
}
```

## 五、接口层问题

### 1. DTO转换重复代码

**问题描述**：  
Controller中存在大量重复的DTO转换逻辑

**解决方案**：  
引入MapStruct进行自动映射

```java
@Mapper(componentModel = "spring")
public interface CertificateMapper {
    CertificateDTO toDTO(Certificate certificate);
}
```

### 2. 异常处理不统一

**问题描述**：  
API错误响应格式不一致

**解决方案**：  
实现@ControllerAdvice统一异常处理

```java
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(CertificateNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound() {
        return ResponseEntity.notFound().build();
    }
}
```

## 六、测试问题

### 1. 集成测试数据污染

**问题描述**：  
测试用例之间数据相互影响

**解决方案**：  
使用@Transactional和@Rollback注解

```java
@SpringBootTest
@Transactional
@Rollback
class CertificateServiceIntegrationTest {
    // 测试方法
}
```

### 2. Mock过度使用

**问题描述**：  
单元测试过度依赖Mock导致测试价值降低

**解决方案**：  
合理划分测试边界：

- 领域对象：纯单元测试
- 应用服务：部分Mock
- 基础设施：真实数据库测试
