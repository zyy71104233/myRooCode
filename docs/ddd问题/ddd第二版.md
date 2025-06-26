# DDD开发问题与解决方案记录

## 1. Java版本兼容性问题

### 问题描述

- 编译错误：找不到String.isBlank()方法
- 影响文件：
    - CertificateContent.java
    - Certificate.java
- 错误表现：虽然pom.xml配置了Java 17，但编译器未正确识别Java 11+特性

### 解决方案

1. 将isBlank()替换为兼容性更好的trim().isEmpty()组合
2. 修改位置：

    ```java
    // 原代码
    if (publicKey == null || publicKey.isBlank())

    // 修改后
    if (publicKey == null || publicKey.trim().isEmpty())
    ```

### 预防手段

- 明确在pom.xml中指定Java版本：
    ```xml
    <properties>
      <java.version>17</java.version>
    </properties>
    ```
- 在IDE中配置正确的Java SDK版本

## 2. Spring Boot主类缺失问题

### 问题描述

- Maven构建失败：Spring Boot repackage阶段报错"Unable to find main class"
- 原因：缺少@SpringBootApplication注解的主类

### 解决方案

1. 创建标准Spring Boot主类：

    ```java
    package com.example.certificate;

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;

    @SpringBootApplication
    public class Application {
        public static void main(String[] args) {
            SpringApplication.run(Application.class, args);
        }
    }
    ```

### 预防手段

- 使用Spring Initializr创建项目时会自动生成主类
- 在项目初期就建立好主类结构

## 3. Maven构建配置问题

### 问题描述

- 初始pom.xml配置不完整导致构建失败
- 包括：缺少必要的依赖、插件配置不正确等

### 解决方案

1. 完善pom.xml配置：
    - 添加Spring Boot父POM
    - 配置正确的Java版本
    - 添加必要的依赖(mysql-connector-java等)
    - 配置maven-compiler-plugin

### 预防手段

- 使用标准的Spring Boot项目模板
- 在项目初期就验证构建流程
