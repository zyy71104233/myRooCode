# 证书管理系统开发问题总结

## 遇到的问题及解决方案

错误还有

1pom内容缺失，编译失败，

2测试类选用的模型为什么参数对不上，或者方法名不对，

具体如下：

1. 编译失败，错误信息显示"无效的标记: --release"
2. 可能是Maven编译器插件版本与Java 17不兼容
3. 需要更新pom.xml中的编译器插件配置
4. 修改为支持Java 17的配置

5. 编译错误可能是由于编译器插件版本问题
6. 需要显式配置maven-compiler-plugin

7. 编译错误显示测试类与模型类不匹配：
    - CertificateContent构造器参数不匹配(需要3个参数但测试中只传了2个)
    - 缺少getId()和isEmpty()方法
8. DomainName类使用@Value注解，自动生成getter和equals/hashCode方法
9. 测试类中使用了getId()方法，但DomainName类没有id字段
10. 需要为DomainName类添加id字段
11. 或者修改测试类不使用getId()方法
12. 根据DDD原则，DomainName是值对象，不应有id字段
13. 应该修改测试类，使用值对象本身作为标识

14. 确认DomainRepository.java当前内容
15. 需要将findById改为findByValue
16. 需要将deleteById改为deleteByValue
17. 保持方法顺序不变
18. 确保与测试类修改一致

19. 确认CertificateRepository接口当前内容
20. 需要将findById改为findByPublicKey
21. 需要将deleteById改为deleteByPublicKey
22. 保持方法顺序不变
23. 确保与测试类修改一致

24. 测试失败显示DomainRepositoryTest.java中仍在使用isEmpty()方法
25. 需要将isEmpty()调用改为isPresent()的否定形式
26. 需要确保测试类与Java 17 Optional API兼容
27. 需要修改DomainRepositoryTest.java

28. 编译错误显示CertificateRepositoryTest.java中调用了不存在的findById(String)方法
29. 需要检查CertificateRepository接口定义与测试类是否一致
30. 根据DDD原则，证书查询应该基于公钥而非通用ID
31. 需要修改测试类以匹配接口定义
32. 应先读取CertificateRepository接口和测试类内容

33. 发现测试类CertificateRepositoryTest.java第31行错误调用了findById()方法
34. 接口CertificateRepository.java中只有findByPublicKey()方法
35. 需要将测试类中的findById()调用改为findByPublicKey()
36. 修改后应重新运行测试验证

37. 用户要求使用MyBatis而非JPA
38. 需要修改pom.xml添加MyBatis相关依赖
39. 需要创建MyBatis的Mapper接口和XML映射文件
40. 准备基础设施层实现

41. 发现MyBatisDomainRepository方法名与接口不匹配:
    - findByDomainName vs findByValue
    - deleteByDomainName vs deleteByValue
42. save方法返回类型应为DomainName而非void
43. MyBatisCertificateRepository的save方法返回类型应为CertificateContent而非void
44. 需要修改两个Repository实现类
45. 需要先检查Mapper接口方法是否匹配

46. DomainMapper方法名与Repository接口不匹配:
    - findByDomainName vs findByValue
    - deleteByDomainName vs deleteByValue
47. DomainMapper.save返回void而Repository要求返回DomainName
48. CertificateMapper.save返回int而Repository要求返回CertificateContent
49. 需要修改:
    - 更新Mapper接口方法签名
    - 更新Repository实现类
    - 可能需要更新XML映射文件
50. 先修改DomainMapper和CertificateMapper接口

### 1. 数据库初始化问题

**问题现象**：

- Spring Boot测试时未自动执行schema.sql创建测试数据库
- 手动执行SQL脚本时遇到Windows重定向符不兼容问题

**原因分析**：

- Windows CMD不支持`<`重定向操作符
- schema.sql中的索引长度超过MySQL限制(3072字节)

**解决方案**：

1. 修改schema.sql：
    - 将VARCHAR(2048)改为TEXT类型
    - 添加前缀索引`UNIQUE KEY idx_public_key (public_key(255))`
2. 使用交互式MySQL客户端执行：

    ```bash
    mysql -u root -p
    source src/main/resources/schema.sql
    ```

### 2. MySQL驱动配置问题

**问题现象**：

- 测试报错"Failed to determine a suitable driver class"

**原因分析**：

- pom.xml中使用的是旧版MySQL驱动坐标(mysql:mysql-connector-java)
- MySQL官方已将驱动迁移到新坐标(com.mysql:mysql-connector-j)

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

### 3. MyBatis映射问题

**问题现象**：

- 测试报错"Invalid bound statement (not found): DomainMapper.save"

**原因分析**：

- DomainMapper.xml中可能缺少对应的SQL映射
- 或Mapper文件未被正确扫描

**解决方案**：

1. 检查DomainMapper.xml是否包含对应SQL映射
2. 确认MyBatis配置正确扫描了Mapper文件

### 4. 测试数据初始化问题

**问题现象**：

- 每次执行测试前需要手动准备测试数据
- 测试用例之间存在数据依赖

**原因分析**：

- 未使用测试数据初始化框架(如Flyway或Liquibase)
- 缺少测试数据工厂模式实现

**解决方案**：

1. 引入测试数据初始化工具：

    ```java
    @BeforeEach
    void setUp() {
     TestDataFactory.initTestData();
    }
    ```

2. 实现测试数据工厂：

    ```java
    class TestDataFactory {
     static void initTestData() {
         // 初始化基础测试数据
     }
    }
    ```

## 经验总结

1. **环境兼容性检查**：

    - 开发前确认操作系统特性差异（如Windows与Linux命令差异）
    - 使用跨平台兼容的命令或脚本

2. **依赖管理最佳实践**：

    - 定期检查依赖库的官方文档
    - 使用最新稳定版本的依赖
    - 配置依赖版本管理(如Maven properties)

3. **数据库设计注意事项**：

    - 了解不同数据库引擎的索引限制
    - 对于大文本字段，考虑使用前缀索引
    - 测试环境与生产环境数据库配置保持一致

4. **测试环境配置**：

    - 确保测试资源配置完整(如application-test.properties)
    - 在CI/CD流程中加入环境验证步骤

5. **问题排查方法**：

    - 从错误日志的最底层原因开始排查
    - 使用分层验证法（先验证数据库连接，再验证ORM映射）
    - 编写集成测试时逐步增加测试范围

6. **文档记录**：

    - 记录开发过程中遇到的典型问题及解决方案
    - 维护项目特有的配置说明文档
    - 记录环境配置要求和依赖版本说明
