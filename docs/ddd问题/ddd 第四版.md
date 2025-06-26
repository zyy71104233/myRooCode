# DDD实现问题与解决方案汇总（第四版）

## 1. 数据库连接问题

### 问题描述

- 测试环境数据库连接失败，报错"Public Key Retrieval is not allowed"
- 开发环境数据库连接超时
- 测试类缺少数据库连接配置

### 解决方案

1. 在application-test.properties中添加：

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/certificate_test?allowPublicKeyRetrieval=true&useSSL=false
```

2. 确保MySQL服务正常运行
3. 创建TestConfig配置类添加@SpringBootTest注解

### 预防手段

- 统一数据库连接配置模板
- 在项目文档中记录数据库配置要求

## 2. MyBatis映射问题

### 问题描述

- 类型转换错误：TEXT列无法映射到LocalDate
- 嵌套对象映射失败
- 动态SQL条件判断错误

### 解决方案

1. 修改Mapper.xml中的resultMap定义：

```xml
<result column="expire_date" property="expireDate" jdbcType="DATE"/>
```

2. 使用association处理嵌套对象
3. 修正动态SQL中的条件判断逻辑

## 3. 测试配置问题

### 问题描述

- 测试类缺少@SpringBootConfiguration
- 缺少@ActiveProfiles("test")注解
- 测试数据初始化失败

### 解决方案

1. 创建TestConfig配置类：

```java
@SpringBootConfiguration
@ActiveProfiles("test")
public class TestConfig {}
```

2. 在测试类添加@Import(TestConfig.class)
3. 使用@Sql注解初始化测试数据

## 4. 领域模型问题

### 问题描述

- Certificate聚合根设计不合理
- 值对象验证逻辑缺失
- 领域事件发布时机错误

### 解决方案

1. 重构Certificate聚合根：

```java
public class Certificate {
    private CertificateId id;
    private CertificateContent content;
    private CertificateStatus status;

    public void revoke() {
        this.status = CertificateStatus.REVOKED;
        registerEvent(new CertificateRevokedEvent(this.id));
    }
}
```

2. 在值对象中添加验证逻辑
3. 调整领域事件发布时机

## 5. 仓库实现问题

### 问题描述

- 仓库接口与实现不匹配
- 分页查询实现错误
- 缓存策略冲突

### 解决方案

1. 统一仓库接口定义：

```java
public interface CertificateRepository {
    Optional<Certificate> findById(CertificateId id);
    Page<Certificate> findByStatus(CertificateStatus status, Pageable pageable);
}
```

2. 修正MyBatis分页查询实现
3. 明确缓存策略（使用@Cacheable注解）

## 6. 应用服务问题

### 问题描述

- 事务边界定义错误
- 领域服务调用顺序问题
- DTO转换逻辑缺失

### 解决方案

1. 调整事务注解范围：

```java
@Transactional
public class CertificateApplicationService {
    @Transactional(readOnly = true)
    public CertificateDTO getCertificate(String id) {
        // ...
    }
}
```

2. 明确服务调用顺序
3. 添加DTO转换器

## 7. API接口问题

### 问题描述

- RESTful规范不符合
- 参数验证缺失
- 异常处理不统一

### 解决方案

1. 遵循RESTful规范设计端点：

```java
@PostMapping("/certificates")
public ResponseEntity<Void> createCertificate(@Valid @RequestBody CreateCertificateRequest request) {
    // ...
}
```

2. 添加@Valid注解进行参数验证
3. 创建全局异常处理器

## 8. 集成测试问题

### 问题描述

- 测试数据污染
- 测试顺序依赖
- 模拟对象配置错误

### 解决方案

1. 使用@Transactional确保测试回滚
2. 添加@TestMethodOrder注解控制顺序
3. 正确配置MockBean

## 总结

| 问题类型    | 出现频率 | 解决状态 | 影响程度 |
| ----------- | -------- | -------- | -------- |
| 数据库连接  | 高       | 已解决   | 高       |
| MyBatis映射 | 中       | 已解决   | 中       |
| 测试配置    | 高       | 已解决   | 中       |
| 领域模型    | 中       | 已解决   | 高       |
| 仓库实现    | 中       | 已解决   | 中       |
| 应用服务    | 低       | 已解决   | 高       |
| API接口     | 低       | 已解决   | 中       |
| 集成测试    | 中       | 已解决   | 低       |
