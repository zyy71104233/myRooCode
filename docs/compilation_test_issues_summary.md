# 证书管理系统编译与测试问题总结

## 1. Maven编译配置问题

**问题现象**：

- 编译失败，错误信息显示"无效的标记: --release"
- Maven编译器插件版本与Java 17不兼容

**原因分析**：

- 旧版maven-compiler-plugin不支持Java 17特性
- 缺少明确的Java版本配置

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

**经验总结**：

1. 新项目初始化时应立即配置Java版本
2. 使用最新稳定版编译器插件
3. 在CI/CD流程中加入Java版本检查

## 2. 模型与测试类不匹配问题

**问题现象**：

- CertificateContent构造器参数不匹配
- 测试类调用getId()但DomainName是值对象无id字段
- Optional API使用不一致(isEmpty vs isPresent)

**原因分析**：

- 领域模型设计变更未同步更新测试
- 值对象与实体概念混淆
- Java版本API差异

**解决方案**：

1. 统一测试类与模型类构造器参数
2. 修改DomainName测试类，使用值对象本身作为标识：

```java
// 原错误用法
domainName.getId();

// 正确用法
domainName.value();
```

3. 统一Optional API使用：

```java
// 原错误用法
optional.isEmpty();

// 正确用法
!optional.isPresent();
```

**经验总结**：

1. 测试类应与领域模型同步更新
2. 严格遵守DDD值对象设计原则
3. 明确Java版本API差异

## 3. Repository接口设计问题

**问题现象**：

- findById/deleteById方法与领域概念不符
- 证书查询应基于公钥而非通用ID
- 域名查询应基于值而非ID

**解决方案**：

1. 修改DomainRepository接口：

```java
public interface DomainRepository {
    Optional<DomainName> findByValue(String value);
    void deleteByValue(String value);
    // ...
}
```

2. 修改CertificateRepository接口：

```java
public interface CertificateRepository {
    Optional<CertificateContent> findByPublicKey(String publicKey);
    void deleteByPublicKey(String publicKey);
    // ...
}
```

**经验总结**：

1. Repository方法应反映领域语言
2. 避免通用CRUD模式，使用领域特定语义
3. 接口设计应先于实现

## 4. MyBatis映射问题

**问题现象**：

- Mapper方法名与Repository接口不匹配
- save方法返回类型不一致
- XML映射文件未同步更新

**解决方案**：

1. 更新DomainMapper接口：

```java
public interface DomainMapper {
    DomainName findByValue(String value);
    int deleteByValue(String value);
    DomainName save(DomainName domainName);
}
```

2. 更新CertificateMapper接口：

```java
public interface CertificateMapper {
    CertificateContent findByPublicKey(String publicKey);
    int deleteByPublicKey(String publicKey);
    CertificateContent save(CertificateContent content);
}
```

**经验总结**：

1. 保持各层方法签名一致
2. 定义清晰的接口契约
3. 修改接口时应全局搜索相关调用点

## 5. 系统性问题解决流程

1. **立即解决方案**：

    - 修复编译错误
    - 统一接口定义
    - 同步测试用例

2. **长期改进措施**：

    - 建立代码评审checklist
    - 引入架构守护工具(ArchUnit)
    - 完善持续集成流水线

3. **预防性实践**：
    ```mermaid
    graph TD
      A[需求分析] --> B[领域建模]
      B --> C[接口设计]
      C --> D[测试驱动]
      D --> E[实现]
      E --> F[持续集成]
    ```
