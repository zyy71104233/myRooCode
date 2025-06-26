# DDD开发问题全记录（第五版）

## 一、领域层问题

### 1.1 证书编号生成冲突

**问题现象**：

- 测试用例`CertificateTest.shouldPreserveManualNumber`失败
- 手动指定的证书编号在保存后被系统自动生成的编号覆盖
- 业务上需要同时支持自动生成和手动指定两种编号方式

**解决方案**：

```java
// 修改后的Certificate实体构造函数
public Certificate(String number, CertificateType type, User owner) {
    if (number == null) {
        this.number = generateAutoNumber(); // 自动生成
    } else {
        validateManualNumber(number); // 手动编号验证
        this.number = number;
    }
    // 其他初始化逻辑...
}

// 新增编号验证方法
private void validateManualNumber(String number) {
    if (!number.startsWith("MEM-")) {
        throw new InvalidCertificateNumberException();
    }
}
```

**预防手段（可选）**：

- 在领域建模阶段明确区分值对象和实体
- 使用工厂方法封装不同的创建逻辑

### 1.2 证书状态流转异常

**问题现象**：

- 证书从"已签发"状态可以直接变为"已作废"
- 缺少必要的"已吊销"中间状态
- 违反业务规则：必须先吊销才能作废

**解决方案**：

```java
// 状态机实现
public void revoke() {
    if (this.status != Status.ISSUED) {
        throw new IllegalStatusTransitionException();
    }
    this.status = Status.REVOKED;
}

public void invalidate() {
    if (this.status != Status.REVOKED) { // 必须先吊销
        throw new IllegalStatusTransitionException();
    }
    this.status = Status.INVALIDATED;
}
```

**预防手段（可选）**：

- 使用状态模式实现状态机
- 绘制状态流转图并纳入领域文档

## 二、应用层问题

### 2.1 DTO字段映射缺失

**问题现象**：

- 证书有效期字段未映射到DTO
- 导致前端显示缺少有效期信息
- Postman测试返回数据不完整

**解决方案**：

```java
// 修复后的DTO转换
public CertificateDTO toDTO(Certificate cert) {
    return new CertificateDTO(
        cert.getNumber(),
        cert.getType().getName(),
        cert.getExpiryDate(), // 新增字段
        // 其他字段...
    );
}
```

**预防手段（可选）**：

- 使用MapStruct等映射工具
- 建立DTO字段检查清单

### 2.2 事务管理不当

**问题现象**：

- 批量签发证书时部分失败导致数据不一致
- 缺少@Transactional注解

**解决方案**：

```java
@Transactional
public void batchIssueCertificates(List<Certificate> certificates) {
    certificates.forEach(this::issueCertificate);
}
```

**预防手段（可选）**：

- 在应用服务层统一添加事务注解
- 使用Spring的@TransactionalEventListener

## 三、基础设施层问题

### 3.1 Repository测试数据问题

**问题现象**：

- CertificateRepositoryTest.findByName测试失败
- 测试数据未正确初始化
- 实际运行时报NPE

**解决方案**：

```java
@BeforeEach
void setUp() {
    CertificateType type = new CertificateType("VIP");
    testCertificate = new Certificate("VIP-001", type, testUser);
    repository.save(testCertificate);
}
```

**预防手段（可选）**：

- 使用@Sql初始化测试数据
- 引入测试数据构建器

## 四、接口层问题

### 4.1 API版本兼容问题

**问题现象**：

- 客户端调用/v1/certificates接口失败
- 请求头缺少Accept版本信息

**解决方案**：

```java
@GetMapping(path = "/certificates",
           headers = "Accept=application/vnd.company.v1+json")
public List<CertificateDTO> getCertificatesV1() {
    // v1实现
}
```

**预防手段（可选）**：

- 使用Spring的ContentNegotiationStrategy
- 维护API版本变更日志

## 五、测试相关问题

### 5.1 测试数据污染

**问题现象**：

- 测试用例间相互影响
- 数据库残留测试数据

**解决方案**：

```java
@AfterEach
void tearDown() {
    repository.deleteAll();
}
```

**预防手段（可选）**：

- 使用@DirtiesContext
- 配置测试专用数据库
