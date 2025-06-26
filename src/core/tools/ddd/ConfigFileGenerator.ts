import * as fs from "fs"
import * as path from "path"
import { TechStackContext } from "./TechStackContext"

/**
 * 配置文件生成结果接口
 * Configuration file generation result interface
 */
export interface ConfigFileGenerationResult {
	success: boolean // 生成是否成功 / Whether generation was successful
	filesGenerated: string[] // 已生成的文件列表 / List of generated files
	errors: string[] // 错误信息列表 / List of error messages
	warnings: string[] // 警告信息列表 / List of warning messages
}

/**
 * 项目信息接口
 * Project information interface
 */
export interface ProjectInfo {
	groupId: string // Maven groupId（如：com.certmgr）/ Maven groupId (e.g., com.certmgr)
	artifactId: string // Maven artifactId（如：certificate-management）/ Maven artifactId (e.g., certificate-management)
	version: string // 项目版本（如：1.0-SNAPSHOT）/ Project version (e.g., 1.0-SNAPSHOT)
	name?: string // 项目显示名称 / Project display name
	description?: string // 项目描述 / Project description
	basePackage?: string // 基础包名（如：com.certmgr）/ Base package name (e.g., com.certmgr)
}

/**
 * DDD架构配置文件生成器
 * DDD Architecture Configuration File Generator
 *
 * 负责按照正确的顺序生成DDD项目所需的所有配置文件，确保：
 * Responsible for generating all configuration files required for DDD projects in the correct order, ensuring:
 * 1. 严格遵循技术栈约定（Java 8 + Spring Boot 2.7.18 + MyBatis）
 * 2. 配置文件的生成顺序正确（pom.xml → application.yml → schema.sql）
 * 3. 数据库配置在基础设施层开发前就绪
 * 4. 完整的目录结构创建
 *
 * @author DDD Framework
 * @version 1.0.0
 * @since 2024-12-22
 */
export class ConfigFileGenerator {
	/**
	 * 生成完整的配置文件集合
	 * Generate complete set of configuration files
	 *
	 * 按照DDD架构要求和技术栈约定，生成项目所需的所有配置文件
	 * Generate all configuration files required for the project according to DDD architecture requirements and tech stack conventions
	 *
	 * 生成顺序 / Generation order:
	 * 1. pom.xml - Maven项目配置，定义依赖和构建设置
	 * 2. application.yml - Spring Boot主配置文件
	 * 3. application-dev.yml - 开发环境配置
	 * 4. application-prod.yml - 生产环境配置
	 * 5. schema.sql - 数据库初始化脚本
	 * 6. logback-spring.xml - 日志配置
	 * 7. 标准目录结构 - DDD架构包结构
	 *
	 * @param {string} cwd - 项目根目录路径 / Project root directory path
	 * @param {ProjectInfo} projectInfo - 项目信息 / Project information
	 * @returns {Promise<ConfigFileGenerationResult>} 生成结果 / Generation result
	 */
	async generateAllConfigFiles(cwd: string, projectInfo: ProjectInfo): Promise<ConfigFileGenerationResult> {
		const result: ConfigFileGenerationResult = {
			success: true,
			filesGenerated: [],
			errors: [],
			warnings: [],
		}

		try {
			// 1. 生成 pom.xml
			await this.generatePomXml(cwd, projectInfo, result)

			// 2. 生成 application.yml
			await this.generateApplicationYml(cwd, result)

			// 3. 生成 application-dev.yml
			await this.generateApplicationDevYml(cwd, result)

			// 4. 生成 application-prod.yml
			await this.generateApplicationProdYml(cwd, result)

			// 5. 生成 schema.sql
			await this.generateSchemaSql(cwd, result)

			// 6. 生成 logback-spring.xml
			await this.generateLogbackConfig(cwd, result)

			// 7. 创建必要的目录结构
			await this.createDirectoryStructure(cwd, projectInfo, result)

			result.success = result.errors.length === 0
		} catch (error) {
			result.success = false
			result.errors.push(`配置文件生成失败: ${error instanceof Error ? error.message : String(error)}`)
		}

		return result
	}

	/**
	 * 生成 pom.xml
	 */
	private async generatePomXml(
		cwd: string,
		projectInfo: ProjectInfo,
		result: ConfigFileGenerationResult,
	): Promise<void> {
		const techStack = TechStackContext.getStandardStack()
		const pomPath = path.join(cwd, "pom.xml")

		const pomContent = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>${projectInfo.groupId}</groupId>
    <artifactId>${projectInfo.artifactId}</artifactId>
    <version>${projectInfo.version}</version>
    <packaging>jar</packaging>

    <name>${projectInfo.name || projectInfo.artifactId}</name>
    <description>${projectInfo.description || "DDD架构项目"}</description>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>${techStack.springBootVersion}</version>
        <relativePath/>
    </parent>

    <properties>
        <java.version>${techStack.javaVersion}</java.version>
        <project.build.sourceEncoding>${techStack.encoding}</project.build.sourceEncoding>
        <project.reporting.outputEncoding>${techStack.encoding}</project.reporting.outputEncoding>
        <mybatis.version>${techStack.mybatisVersion}</mybatis.version>
        <mybatis.spring.version>${techStack.mybatisSpringVersion}</mybatis.spring.version>
        <lombok.version>${techStack.lombokVersion}</lombok.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- MySQL 驱动 -->
        <dependency>
            <groupId>mysql</groupId>
            <artifactId>${techStack.mysqlDriverType}</artifactId>
            <version>${techStack.mysqlDriverVersion}</version>
            <scope>runtime</scope>
        </dependency>

        <!-- MyBatis Spring Boot Starter -->
        <dependency>
            <groupId>org.mybatis.spring.boot</groupId>
            <artifactId>mybatis-spring-boot-starter</artifactId>
            <version>\${mybatis.spring.version}</version>
            <exclusions>
                <exclusion>
                    <groupId>com.h2database</groupId>
                    <artifactId>h2</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>\${lombok.version}</version>
            <optional>true</optional>
        </dependency>

        <!-- 测试依赖 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.mybatis.spring.boot</groupId>
            <artifactId>mybatis-spring-boot-starter-test</artifactId>
            <version>\${mybatis.spring.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Maven 编译器插件 -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>${techStack.mavenCompilerPluginVersion}</version>
                <configuration>
                    <source>\${java.version}</source>
                    <target>\${java.version}</target>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                            <version>\${lombok.version}</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
            
            <!-- Spring Boot Maven 插件 -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>`

		fs.writeFileSync(pomPath, pomContent, "utf-8")
		result.filesGenerated.push("pom.xml")
	}

	/**
	 * 生成 application.yml
	 */
	private async generateApplicationYml(cwd: string, result: ConfigFileGenerationResult): Promise<void> {
		const resourcesDir = path.join(cwd, "src", "main", "resources")
		this.ensureDirectoryExists(resourcesDir)

		const ymlPath = path.join(resourcesDir, "application.yml")
		const dbConfig = TechStackContext.getDatabaseConfig()
		const mybatisConfig = TechStackContext.getMybatisConfig()

		const ymlContent = `# Spring Boot 应用配置
spring:
  profiles:
    active: dev
  
  # 数据源配置
  datasource:
    url: ${dbConfig.url}
    username: ${dbConfig.username}
    password: ${dbConfig.password}
    driver-class-name: ${dbConfig.driverClassName}
    
    # 连接池配置
    hikari:
      minimum-idle: ${dbConfig.connectionPool.initialSize}
      maximum-pool-size: ${dbConfig.connectionPool.maxActive}
      connection-timeout: ${dbConfig.connectionPool.maxWait}
      idle-timeout: ${dbConfig.connectionPool.minEvictableIdleTimeMillis}
      max-lifetime: 1800000
      connection-test-query: ${dbConfig.connectionPool.validationQuery}

# MyBatis 配置
mybatis:
  mapper-locations: ${mybatisConfig.mapperLocations}
  type-aliases-package: ${mybatisConfig.typeAliasesPackage}
  configuration:
    map-underscore-to-camel-case: ${mybatisConfig.configuration.mapUnderscoreToCamelCase}
    log-impl: ${mybatisConfig.configuration.logImpl}

# 日志配置
logging:
  level:
    com.certmgr: DEBUG
    org.springframework: INFO
    org.mybatis: DEBUG
  pattern:
    console: "%clr(%d{HH:mm:ss.SSS}){faint} %clr(%-5level) %clr([%thread]){magenta} %clr(%-40.40logger{39}){cyan} %clr(:){faint} %m%n%wEx"

# 服务器配置
server:
  port: 8080
  servlet:
    context-path: /api
    encoding:
      charset: UTF-8
      enabled: true
      force: true`

		fs.writeFileSync(ymlPath, ymlContent, "utf-8")
		result.filesGenerated.push("src/main/resources/application.yml")
	}

	/**
	 * 生成 application-dev.yml
	 */
	private async generateApplicationDevYml(cwd: string, result: ConfigFileGenerationResult): Promise<void> {
		const resourcesDir = path.join(cwd, "src", "main", "resources")
		const ymlPath = path.join(resourcesDir, "application-dev.yml")

		const ymlContent = `# 开发环境配置
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/certificate_mgmt_dev?useSSL=false&serverTimezone=UTC&characterEncoding=utf8
    username: \${DB_USERNAME:root}
    password: \${DB_PASSWORD:password}
  
# 开发环境日志
logging:
  level:
    com.certmgr: DEBUG
    org.springframework.web: DEBUG
    org.mybatis: DEBUG
    sql: DEBUG
  
# 开发环境服务器配置
server:
  port: 8080
  error:
    include-stacktrace: always
    include-message: always

# 开发工具
spring.devtools:
  restart:
    enabled: true
  livereload:
    enabled: true`

		fs.writeFileSync(ymlPath, ymlContent, "utf-8")
		result.filesGenerated.push("src/main/resources/application-dev.yml")
	}

	/**
	 * 生成 application-prod.yml
	 */
	private async generateApplicationProdYml(cwd: string, result: ConfigFileGenerationResult): Promise<void> {
		const resourcesDir = path.join(cwd, "src", "main", "resources")
		const ymlPath = path.join(resourcesDir, "application-prod.yml")

		const ymlContent = `# 生产环境配置
spring:
  datasource:
    url: jdbc:mysql://\${DB_HOST:localhost}:3306/certificate_mgmt_prod?useSSL=true&serverTimezone=UTC&characterEncoding=utf8
    username: \${DB_USERNAME}
    password: \${DB_PASSWORD}
    
    # 生产环境连接池配置
    hikari:
      minimum-idle: 10
      maximum-pool-size: 50
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000

# 生产环境日志
logging:
  level:
    com.certmgr: INFO
    org.springframework: WARN
    org.mybatis: WARN
  file:
    name: logs/certificate-mgmt.log
    max-size: 100MB
    max-history: 30

# 生产环境服务器配置
server:
  port: \${SERVER_PORT:8080}
  error:
    include-stacktrace: never
    include-message: never
  compression:
    enabled: true
    mime-types: text/html,text/xml,text/plain,text/css,text/javascript,application/javascript,application/json
    min-response-size: 1024`

		fs.writeFileSync(ymlPath, ymlContent, "utf-8")
		result.filesGenerated.push("src/main/resources/application-prod.yml")
	}

	/**
	 * 生成数据库初始化脚本
	 */
	private async generateSchemaSql(cwd: string, result: ConfigFileGenerationResult): Promise<void> {
		const resourcesDir = path.join(cwd, "src", "main", "resources")
		const sqlPath = path.join(resourcesDir, "schema.sql")

		const sqlContent = `-- 证书管理系统数据库初始化脚本
-- 基于DDD架构设计
-- MySQL 8.0.33 兼容

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS certificate_mgmt 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE certificate_mgmt;

-- 证书表
CREATE TABLE IF NOT EXISTS certificates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '证书ID',
    certificate_name VARCHAR(255) NOT NULL COMMENT '证书名称',
    certificate_type VARCHAR(50) NOT NULL COMMENT '证书类型',
    issuer VARCHAR(255) NOT NULL COMMENT '颁发机构',
    subject VARCHAR(255) NOT NULL COMMENT '证书主体',
    serial_number VARCHAR(255) NOT NULL UNIQUE COMMENT '序列号',
    valid_from DATETIME NOT NULL COMMENT '有效期开始',
    valid_to DATETIME NOT NULL COMMENT '有效期结束',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态',
    certificate_content LONGTEXT NOT NULL COMMENT '证书内容',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(100) NOT NULL COMMENT '创建人',
    updated_by VARCHAR(100) NOT NULL COMMENT '更新人',
    
    INDEX idx_certificate_type (certificate_type),
    INDEX idx_serial_number (serial_number),
    INDEX idx_status (status),
    INDEX idx_valid_to (valid_to),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='证书信息表';

-- 证书域表
CREATE TABLE IF NOT EXISTS certificate_domains (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '域ID',
    domain_name VARCHAR(255) NOT NULL COMMENT '域名称',
    domain_description TEXT COMMENT '域描述',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(100) NOT NULL COMMENT '创建人',
    updated_by VARCHAR(100) NOT NULL COMMENT '更新人',
    
    UNIQUE KEY uk_domain_name (domain_name),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='证书域表';

-- 证书与域的关联表
CREATE TABLE IF NOT EXISTS certificate_domain_mappings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '映射ID',
    certificate_id BIGINT NOT NULL COMMENT '证书ID',
    domain_id BIGINT NOT NULL COMMENT '域ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    created_by VARCHAR(100) NOT NULL COMMENT '创建人',
    
    UNIQUE KEY uk_cert_domain (certificate_id, domain_id),
    FOREIGN KEY fk_cert_mapping (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE,
    FOREIGN KEY fk_domain_mapping (domain_id) REFERENCES certificate_domains(id) ON DELETE CASCADE,
    INDEX idx_certificate_id (certificate_id),
    INDEX idx_domain_id (domain_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='证书域映射表';

-- 插入初始测试数据
INSERT IGNORE INTO certificate_domains (domain_name, domain_description, created_by, updated_by) VALUES 
('example.com', '示例域', 'system', 'system'),
('test.com', '测试域', 'system', 'system');`

		fs.writeFileSync(sqlPath, sqlContent, "utf-8")
		result.filesGenerated.push("src/main/resources/schema.sql")
	}

	/**
	 * 生成 logback 配置
	 */
	private async generateLogbackConfig(cwd: string, result: ConfigFileGenerationResult): Promise<void> {
		const resourcesDir = path.join(cwd, "src", "main", "resources")
		const logbackPath = path.join(resourcesDir, "logback-spring.xml")

		const logbackContent = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <!-- 日志输出格式 -->
    <property name="CONSOLE_LOG_PATTERN" 
              value="%clr(%d{yyyy-MM-dd HH:mm:ss.SSS}){faint} %clr(%-5level) %clr([%thread]){magenta} %clr(%-40.40logger{39}){cyan} %clr(:){faint} %m%n%wEx"/>
    <property name="FILE_LOG_PATTERN" 
              value="%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %-40.40logger{39} : %m%n"/>

    <!-- 控制台输出 -->
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>\${CONSOLE_LOG_PATTERN}</pattern>
            <charset>UTF-8</charset>
        </encoder>
    </appender>

    <!-- 文件输出 -->
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/certificate-mgmt.log</file>
        <encoder>
            <pattern>\${FILE_LOG_PATTERN}</pattern>
            <charset>UTF-8</charset>
        </encoder>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>logs/certificate-mgmt.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxFileSize>100MB</maxFileSize>
            <maxHistory>30</maxHistory>
            <totalSizeCap>3GB</totalSizeCap>
        </rollingPolicy>
    </appender>

    <!-- 开发环境配置 -->
    <springProfile name="dev">
        <logger name="com.certmgr" level="DEBUG"/>
        <logger name="org.springframework.web" level="DEBUG"/>
        <logger name="org.mybatis" level="DEBUG"/>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <!-- 生产环境配置 -->
    <springProfile name="prod">
        <logger name="com.certmgr" level="INFO"/>
        <logger name="org.springframework" level="WARN"/>
        <logger name="org.mybatis" level="WARN"/>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
            <appender-ref ref="FILE"/>
        </root>
    </springProfile>
</configuration>`

		fs.writeFileSync(logbackPath, logbackContent, "utf-8")
		result.filesGenerated.push("src/main/resources/logback-spring.xml")
	}

	/**
	 * 创建标准目录结构
	 */
	private async createDirectoryStructure(
		cwd: string,
		projectInfo: ProjectInfo,
		result: ConfigFileGenerationResult,
	): Promise<void> {
		const basePackage = projectInfo.basePackage || "com.certmgr"
		const packagePath = basePackage.replace(/\./g, "/")
		const packageStructure = TechStackContext.getStandardPackageStructure(basePackage)

		const directories = [
			// 主代码目录
			`src/main/java/${packagePath}/domain/model`,
			`src/main/java/${packagePath}/domain/repository`,
			`src/main/java/${packagePath}/domain/service`,
			`src/main/java/${packagePath}/infrastructure/repository`,
			`src/main/java/${packagePath}/infrastructure/config`,
			`src/main/java/${packagePath}/application/service`,
			`src/main/java/${packagePath}/application/dto`,
			`src/main/java/${packagePath}/interfaces/rest`,
			`src/main/java/${packagePath}/interfaces/dto`,

			// 测试目录
			`src/test/java/${packagePath}/domain/model`,
			`src/test/java/${packagePath}/domain/repository`,
			`src/test/java/${packagePath}/domain/service`,
			`src/test/java/${packagePath}/infrastructure/repository`,
			`src/test/java/${packagePath}/application/service`,
			`src/test/java/${packagePath}/interfaces/rest`,

			// 资源目录
			"src/main/resources/mapper",
			"src/test/resources",
			"logs",
		]

		for (const dir of directories) {
			const dirPath = path.join(cwd, dir)
			this.ensureDirectoryExists(dirPath)
		}

		result.filesGenerated.push("目录结构")
	}

	/**
	 * 确保目录存在
	 */
	private ensureDirectoryExists(dirPath: string): void {
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true })
		}
	}
}
