# DDD实现问题与解决方案总结（第三版）

## 1. 编译与构建问题

### 1.1 Maven编译配置问题

**问题现象**：

- 编译失败，错误信息显示"无效的标记: --release"
- Maven编译器插件版本与Java 17不兼容

**解决方案**：

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-compiler-plugin</artifactId>
      <version>3.11.0</version>
      <configuration>
        <source>17</source>
        <target>17</target>
      </configuration>
    </plugin>
  </plugins>
</build>
```

### 1.2 MySQL驱动配置问题

**问题现象**：

- 测试报错"Failed to determine a suitable driver class"

**解决方案**：
更新pom.xml依赖：

```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <version>8.0.33</version>
    <scope>runtime</scope>
</dependency>
```

## 2. 领域模型问题

### 2.1 模型与测试类不匹配

**问题现象**：

- CertificateContent构造器参数不匹配
- 测试类调用getId()但DomainName是值对象无id字段
- Optional API使用不一致(isEmpty vs isPresent)

**解决方案**：

1. 统一测试类与模型类构造器参数
2. 修改DomainName测试类：

```java
// 原错误用法
domainName.getId();

// 正确用法
domainName.value();
```

### 2.2 值对象设计问题

**问题现象**：

- 领域模型中值对象与实体概念混淆
- 方法命名不符合领域语言

**解决方案**：

1. 明确区分值对象和实体
2. 使用领域特定命名：

```java
public interface CertificateRepository {
    Optional<Certificate> findByPublicKey(String publicKey);
    void revokeByPublicKey(String publicKey);
}
```

## 3. 持久层问题

### 3.1 MyBatis映射问题

**问题现象**：

- Mapper方法名与Repository接口不匹配
- save方法返回类型不一致

**解决方案**：

```java
public interface CertificateMapper {
    Certificate findByPublicKey(String publicKey);
    int deleteByPublicKey(String publicKey);
    Certificate save(Certificate certificate);
}
```

### 3.2 数据库初始化问题

**问题现象**：

- schema.sql中的索引长度超过MySQL限制(3072字节)

**解决方案**：

1. 修改schema.sql：

```sql
ALTER TABLE certificates
MODIFY COLUMN public_key TEXT,
ADD UNIQUE INDEX idx_public_key (public_key(255));
```

## 4. 测试配置问题

### 4.1 Spring Boot测试配置

**问题现象**：

- 测试类无法加载应用上下文
- @SpringBootTest找不到主配置类

**解决方案**：

1. 创建测试配置类：

```java
@TestConfiguration
@Import({MyBatisConfig.class, RepositoryConfig.class})
public class TestConfig {
    // 测试专用Bean配置
}
```

2. 测试类注解：

```java
@SpringBootTest(classes = TestConfig.class)
@MybatisTest
public class CertificateRepositoryTest {
    // 测试代码
}
```

## 5. 接口层问题

### 5.1 DTO转换问题

**问题现象**：

- Controller返回类型与DTO不匹配
- 字段命名风格不一致

**解决方案**：

1. 统一DTO命名规范：

```java
public class CertificateDTO {
    private String publicKey;
    private String domainName;
    // getters/setters
}
```

2. 添加转换方法：

```java
public CertificateDTO toDTO(Certificate certificate) {
    // 转换逻辑
}
```

## 6. 经验总结

1. **环境一致性**：

    - 开发前确认JDK版本和依赖兼容性
    - 使用Docker统一数据库环境

2. **DDD实践**：

    - 严格区分实体和值对象
    - 使用领域特定语言命名方法

3. **测试策略**：

    - 测试配置应与生产配置分离
    - 为集成测试创建专用配置类

4. **持续改进**：
    - 定期进行代码评审
    - 使用ArchUnit进行架构守护
