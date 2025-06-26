/**
 * DDD技术栈上下文管理器
 * DDD Tech Stack Context Manager
 *
 * 统一管理DDD项目的技术栈约定和配置，确保所有生成的代码都符合预定的技术栈标准
 * Unified management of DDD project tech stack conventions and configurations,
 * ensuring all generated code complies with predefined tech stack standards
 *
 * @author DDD Framework
 * @version 1.0.0
 * @since 2024-12-22
 */
export class TechStackContext {
	/**
	 * 标准技术栈配置（基于执行计划约定）
	 * Standard tech stack configuration (based on execution plan conventions)
	 *
	 * 这些配置严格遵循项目执行计划中的技术栈说明：
	 * These configurations strictly follow the tech stack specifications in the project execution plan:
	 * - Java 8 语言级别 / Java 8 language level
	 * - Spring Boot 2.7.18 (Web MVC + Validation)
	 * - MyBatis 3.5.15 + MyBatis Spring Boot Starter 2.3.1
	 * - MySQL Connector 8.0.33 (传统驱动 / traditional driver)
	 * - Lombok 1.16.20
	 * - Maven 编译插件 3.8.1 / Maven compiler plugin 3.8.1
	 */
	private static readonly STANDARD_STACK = {
		// 核心框架配置 / Core framework configuration
		javaVersion: "8", // Java 版本 / Java version
		springBootVersion: "2.7.18", // Spring Boot 版本 / Spring Boot version
		encoding: "UTF-8", // 字符编码 / Character encoding

		// 数据持久化配置 / Data persistence configuration
		mybatisVersion: "3.5.15", // MyBatis 版本 / MyBatis version
		mybatisSpringVersion: "2.3.1", // MyBatis Spring Boot Starter 版本
		mysqlDriverType: "mysql-connector-java" as const, // MySQL 驱动类型（传统驱动）
		mysqlDriverVersion: "8.0.33", // MySQL 驱动版本 / MySQL driver version

		// 开发工具配置 / Development tools configuration
		lombokVersion: "1.16.20", // Lombok 版本（兼容Java 8）/ Lombok version (Java 8 compatible)
		mavenCompilerPluginVersion: "3.8.1", // Maven 编译器插件版本 / Maven compiler plugin version

		// 测试框架配置 / Testing framework configuration
		springBootTestEnabled: true, // 启用 Spring Boot 测试 / Enable Spring Boot Test
		mybatisTestEnabled: true, // 启用 MyBatis 测试 / Enable MyBatis Test
		h2Excluded: true, // 显式排除 H2 数据库 / Explicitly exclude H2 database
	}

	/**
	 * 获取标准技术栈配置
	 * Get standard tech stack configuration
	 *
	 * 返回一个包含所有技术栈约定的配置对象，用于代码生成和验证
	 * Returns a configuration object containing all tech stack conventions for code generation and validation
	 *
	 * @returns {object} 标准技术栈配置的副本 / Copy of standard tech stack configuration
	 */
	static getStandardStack() {
		return { ...this.STANDARD_STACK }
	}

	/**
	 * 根据Java版本获取合适的注解
	 * Get appropriate annotations based on Java version
	 *
	 * 根据指定的Java版本返回兼容的注解列表，确保生成的代码使用正确的注解
	 * Returns a list of compatible annotations based on the specified Java version,
	 * ensuring generated code uses correct annotations
	 *
	 * @param {string} javaVersion - Java版本，默认为"8" / Java version, defaults to "8"
	 * @returns {string[]} 兼容的注解列表 / List of compatible annotations
	 */
	static getAnnotations(javaVersion: string = "8"): string[] {
		// 基础注解（所有版本通用）/ Base annotations (common to all versions)
		const baseAnnotations = [
			"@Component", // Spring 组件注解 / Spring component annotation
			"@Service", // Spring 服务注解 / Spring service annotation
			"@Repository", // Spring 仓储注解 / Spring repository annotation
			"@Controller", // Spring 控制器注解 / Spring controller annotation
			"@RestController", // Spring REST控制器注解 / Spring REST controller annotation
			"@Autowired", // Spring 依赖注入注解 / Spring dependency injection annotation
			"@Value", // Spring 值注入注解 / Spring value injection annotation
			"@Configuration", // Spring 配置类注解 / Spring configuration class annotation
			"@Bean", // Spring Bean定义注解 / Spring bean definition annotation
		]

		// Java 8 特定注解（包含Lombok支持）/ Java 8 specific annotations (including Lombok support)
		if (javaVersion === "8") {
			return [
				...baseAnnotations,
				// Lombok 注解（Java 8兼容版本）/ Lombok annotations (Java 8 compatible versions)
				"@Data", // Lombok 数据类注解（自动生成getter/setter等）
				"@NoArgsConstructor", // Lombok 无参构造器注解
				"@AllArgsConstructor", // Lombok 全参构造器注解
				"@Builder", // Lombok 建造者模式注解
				"@Slf4j", // Lombok 日志注解
			]
		}

		// 其他版本返回基础注解 / Other versions return base annotations
		return baseAnnotations
	}

	/**
	 * 根据技术栈获取标准导入
	 * Get standard imports based on tech stack
	 *
	 * 根据组件类型返回相应的标准导入语句，确保代码使用正确的依赖
	 * Returns appropriate standard import statements based on component type,
	 * ensuring code uses correct dependencies
	 *
	 * @param {string} componentType - 组件类型 / Component type
	 *   - "entity": 实体类 / Entity class
	 *   - "repository": 仓储类 / Repository class
	 *   - "service": 服务类 / Service class
	 *   - "controller": 控制器类 / Controller class
	 * @returns {string[]} 标准导入语句列表 / List of standard import statements
	 */
	static getStandardImports(componentType: "entity" | "repository" | "service" | "controller"): string[] {
		// 通用导入（Lombok相关）/ Common imports (Lombok related)
		const commonImports = [
			"import lombok.Data;", // Lombok 数据类支持
			"import lombok.NoArgsConstructor;", // Lombok 无参构造器支持
			"import lombok.AllArgsConstructor;", // Lombok 全参构造器支持
			"import lombok.Builder;", // Lombok 建造者模式支持
		]

		// 根据组件类型返回特定导入 / Return specific imports based on component type
		switch (componentType) {
			case "entity":
				// 实体类导入（验证相关）/ Entity class imports (validation related)
				return [
					...commonImports,
					"import javax.validation.constraints.NotNull;", // 非空验证注解
					"import javax.validation.constraints.NotBlank;", // 非空白验证注解
					"import javax.validation.constraints.Size;", // 大小验证注解
				]

			case "repository":
				// 仓储类导入（MyBatis相关）/ Repository class imports (MyBatis related)
				return [
					...commonImports,
					"import org.apache.ibatis.annotations.Mapper;", // MyBatis Mapper注解
					"import org.apache.ibatis.annotations.Select;", // MyBatis Select注解
					"import org.apache.ibatis.annotations.Insert;", // MyBatis Insert注解
					"import org.apache.ibatis.annotations.Update;", // MyBatis Update注解
					"import org.apache.ibatis.annotations.Delete;", // MyBatis Delete注解
					"import org.springframework.stereotype.Repository;", // Spring Repository注解
				]

			case "service":
				// 服务类导入（Spring服务相关）/ Service class imports (Spring service related)
				return [
					...commonImports,
					"import org.springframework.stereotype.Service;", // Spring Service注解
					"import org.springframework.beans.factory.annotation.Autowired;", // Spring 依赖注入
					"import org.springframework.transaction.annotation.Transactional;", // Spring 事务注解
				]

			case "controller":
				// 控制器类导入（Spring Web相关）/ Controller class imports (Spring Web related)
				return [
					...commonImports,
					"import org.springframework.web.bind.annotation.*;", // Spring Web注解包
					"import org.springframework.beans.factory.annotation.Autowired;", // Spring 依赖注入
					"import org.springframework.http.ResponseEntity;", // HTTP响应实体
					"import javax.validation.Valid;", // 验证注解
				]

			default:
				// 默认返回通用导入 / Default return common imports
				return commonImports
		}
	}

	/**
	 * 获取MyBatis相关配置
	 * Get MyBatis related configuration
	 *
	 * 返回MyBatis的标准配置信息，用于生成application.yml配置文件
	 * Returns standard MyBatis configuration for generating application.yml configuration file
	 *
	 * @returns {object} MyBatis配置对象 / MyBatis configuration object
	 */
	static getMybatisConfig() {
		return {
			// MyBatis映射文件位置 / MyBatis mapper file location
			mapperLocations: "classpath:mapper/*.xml",
			// 类型别名包路径 / Type aliases package path
			typeAliasesPackage: "com.certmgr.domain.model",
			// MyBatis配置选项 / MyBatis configuration options
			configuration: {
				// 下划线转驼峰命名 / Underscore to camel case conversion
				mapUnderscoreToCamelCase: true,
				// 日志实现（开发环境用于调试SQL）/ Log implementation (for SQL debugging in dev environment)
				logImpl: "org.apache.ibatis.logging.stdout.StdOutImpl",
			},
		}
	}

	/**
	 * 获取数据库连接配置
	 * Get database connection configuration
	 *
	 * 返回数据库连接的标准配置，包括连接池设置
	 * Returns standard database connection configuration including connection pool settings
	 *
	 * @returns {object} 数据库配置对象 / Database configuration object
	 */
	static getDatabaseConfig() {
		return {
			// 数据库连接URL（MySQL 8.0兼容）/ Database connection URL (MySQL 8.0 compatible)
			url: "jdbc:mysql://localhost:3306/certificate_mgmt?useSSL=false&serverTimezone=UTC&characterEncoding=utf8",
			// 数据库用户名（支持环境变量）/ Database username (supports environment variables)
			username: "${DB_USERNAME:root}",
			// 数据库密码（支持环境变量）/ Database password (supports environment variables)
			password: "${DB_PASSWORD:password}",
			// JDBC驱动类名（传统驱动）/ JDBC driver class name (traditional driver)
			driverClassName: "com.mysql.jdbc.Driver",
			// 连接池配置（HikariCP）/ Connection pool configuration (HikariCP)
			connectionPool: {
				initialSize: 5, // 初始连接数 / Initial connection count
				maxActive: 20, // 最大活跃连接数 / Maximum active connections
				maxWait: 60000, // 最大等待时间（毫秒）/ Maximum wait time (milliseconds)
				timeBetweenEvictionRunsMillis: 60000, // 连接回收间隔时间
				minEvictableIdleTimeMillis: 300000, // 最小空闲时间
				validationQuery: "SELECT 1 FROM DUAL", // 连接验证查询
				testWhileIdle: true, // 空闲时测试连接
				testOnBorrow: false, // 借用时不测试连接（性能考虑）
				testOnReturn: false, // 归还时不测试连接（性能考虑）
			},
		}
	}

	/**
	 * 验证技术栈兼容性
	 * Validate tech stack compatibility
	 *
	 * 检查指定的Java版本和Spring Boot版本是否与技术栈约定兼容
	 * Check if specified Java version and Spring Boot version are compatible with tech stack conventions
	 *
	 * @param {string} javaVersion - Java版本 / Java version
	 * @param {string} springBootVersion - Spring Boot版本 / Spring Boot version
	 * @returns {object} 兼容性检查结果 / Compatibility check result
	 *   - compatible: 是否兼容 / Whether compatible
	 *   - issues: 发现的问题列表 / List of issues found
	 *   - recommendations: 建议列表 / List of recommendations
	 */
	static validateCompatibility(
		javaVersion: string,
		springBootVersion: string,
	): {
		compatible: boolean
		issues: string[]
		recommendations: string[]
	} {
		const issues: string[] = []
		const recommendations: string[] = []

		// 检查Java版本兼容性 / Check Java version compatibility
		if (javaVersion !== "8") {
			issues.push(`期望Java版本为8，实际为${javaVersion}`)
			recommendations.push("请使用Java 8以符合技术栈约定")
		}

		// 检查Spring Boot版本兼容性 / Check Spring Boot version compatibility
		if (springBootVersion !== "2.7.18") {
			issues.push(`期望Spring Boot版本为2.7.18，实际为${springBootVersion}`)
			recommendations.push("请使用Spring Boot 2.7.18以符合技术栈约定")
		}

		// 检查Java 8 + Spring Boot 2.7.18组合兼容性 / Check Java 8 + Spring Boot 2.7.18 combination compatibility
		if (javaVersion === "8" && springBootVersion.startsWith("3.")) {
			issues.push("Java 8不支持Spring Boot 3.x")
			recommendations.push("Java 8应配合Spring Boot 2.7.x使用")
		}

		return {
			compatible: issues.length === 0,
			issues,
			recommendations,
		}
	}

	/**
	 * 生成标准的包结构
	 * Generate standard package structure
	 *
	 * 根据基础包名生成DDD架构的标准包结构
	 * Generate standard package structure for DDD architecture based on base package name
	 *
	 * @param {string} basePackage - 基础包名，默认为"com.certmgr" / Base package name, defaults to "com.certmgr"
	 * @returns {object} 包结构对象 / Package structure object
	 */
	static getStandardPackageStructure(basePackage: string = "com.certmgr") {
		return {
			// 领域层包结构 / Domain layer package structure
			domain: {
				model: `${basePackage}.domain.model`, // 领域模型（实体、值对象）
				repository: `${basePackage}.domain.repository`, // 领域仓储接口
				service: `${basePackage}.domain.service`, // 领域服务
			},
			// 基础设施层包结构 / Infrastructure layer package structure
			infrastructure: {
				repository: `${basePackage}.infrastructure.repository`, // 仓储实现
				config: `${basePackage}.infrastructure.config`, // 基础设施配置
			},
			// 应用层包结构 / Application layer package structure
			application: {
				service: `${basePackage}.application.service`, // 应用服务
				dto: `${basePackage}.application.dto`, // 应用层数据传输对象
			},
			// 接口层包结构 / Interface layer package structure
			interfaces: {
				rest: `${basePackage}.interfaces.rest`, // REST接口
				dto: `${basePackage}.interfaces.dto`, // 接口层数据传输对象
			},
		}
	}

	/**
	 * 获取测试相关配置
	 * Get test related configuration
	 *
	 * 返回测试框架的标准配置，包括注解和导入语句
	 * Returns standard configuration for testing framework, including annotations and import statements
	 *
	 * @returns {object} 测试配置对象 / Test configuration object
	 */
	static getTestConfig() {
		return {
			// 测试注解（Spring Boot Test + JUnit 5）/ Test annotations (Spring Boot Test + JUnit 5)
			testAnnotations: [
				"@ExtendWith(SpringExtension.class)", // JUnit 5 Spring扩展
				"@SpringBootTest", // Spring Boot测试注解
				"@AutoConfigureTestDatabase", // 自动配置测试数据库
				"@Transactional", // 事务注解（测试回滚）
				"@Rollback", // 测试回滚注解
			],
			// Mock相关注解 / Mock related annotations
			mockAnnotations: [
				"@Mock", // Mockito Mock注解
				"@MockBean", // Spring Boot MockBean注解
				"@InjectMocks", // Mockito 注入Mock注解
			],
			// 测试相关导入语句 / Test related import statements
			testImports: [
				"import org.junit.jupiter.api.Test;", // JUnit 5 测试注解
				"import org.junit.jupiter.api.BeforeEach;", // JUnit 5 前置方法注解
				"import org.junit.jupiter.api.extension.ExtendWith;", // JUnit 5 扩展注解
				"import org.springframework.boot.test.context.SpringBootTest;", // Spring Boot测试
				"import org.springframework.test.context.junit.jupiter.SpringExtension;", // Spring JUnit扩展
				"import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;", // JPA测试
				"import org.springframework.test.annotation.Rollback;", // 测试回滚
				"import org.springframework.transaction.annotation.Transactional;", // 事务支持
				"import static org.junit.jupiter.api.Assertions.*;", // JUnit 5 断言
				"import static org.mockito.Mockito.*;", // Mockito Mock方法
			],
		}
	}
}
