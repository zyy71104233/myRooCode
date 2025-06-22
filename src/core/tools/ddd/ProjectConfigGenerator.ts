import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"

const execAsync = promisify(exec)

export interface MavenConfig {
	javaVersion: string
	compilerPluginVersion: string
	mysqlDriverType: "mysql-connector-j" | "mysql-connector-java"
	mysqlDriverVersion: string
	springBootVersion?: string
	lombokVersion?: string
	mybatisVersion?: string
	mybatisSpringVersion?: string
}

export interface ProjectConfigGenerationResult {
	success: boolean
	pomXmlPath?: string
	generatedConfig: MavenConfig
	warnings: string[]
	errors: string[]
}

/**
 * 项目配置生成器 - 解决Maven编译配置问题
 * 基于certificate_issues_combined.md中的问题1.1和1.2
 */
export class ProjectConfigGenerator {
	/**
	 * 生成符合技术栈约定的Maven配置
	 * 基于执行计划中的技术栈说明
	 */
	generateStandardMavenConfig(): MavenConfig {
		return {
			javaVersion: "8",
			compilerPluginVersion: "3.8.1",
			mysqlDriverType: "mysql-connector-java", // 按约定使用传统驱动
			mysqlDriverVersion: "8.0.33",
			springBootVersion: "2.7.18",
			lombokVersion: "1.16.20",
			mybatisVersion: "3.5.15",
			mybatisSpringVersion: "2.3.1",
		}
	}

	/**
	 * 检测Java版本并生成兼容的Maven配置
	 */
	async generateMavenConfig(cwd: string, javaVersion?: string, useStandardConfig?: boolean): Promise<MavenConfig> {
		// 如果指定使用标准配置，直接返回技术栈约定的配置
		if (useStandardConfig) {
			return this.generateStandardMavenConfig()
		}

		const detectedJavaVersion = javaVersion || (await this.detectJavaVersion())

		// 根据Java版本选择兼容的配置
		const config: MavenConfig = {
			javaVersion: detectedJavaVersion,
			compilerPluginVersion: this.getCompatibleCompilerPlugin(detectedJavaVersion),
			mysqlDriverType: "mysql-connector-j", // 使用新版驱动
			mysqlDriverVersion: "8.0.33",
			springBootVersion: this.getCompatibleSpringBootVersion(detectedJavaVersion),
			lombokVersion: "1.18.24",
			mybatisVersion: "3.5.15",
			mybatisSpringVersion: "2.3.1",
		}

		return config
	}

	/**
	 * 检测当前Java版本
	 */
	async detectJavaVersion(): Promise<string> {
		try {
			const { stdout } = await execAsync("java -version")
			const versionMatch = stdout.match(/version "([^"]+)"/) || stdout.match(/version ([^\s]+)/)
			if (versionMatch) {
				const fullVersion = versionMatch[1]
				// 提取主版本号 (如 "1.8.0_202" -> "8", "17.0.1" -> "17")
				if (fullVersion.startsWith("1.")) {
					return fullVersion.split(".")[1] // 1.8.x -> 8
				} else {
					return fullVersion.split(".")[0] // 17.x -> 17
				}
			}
			return "17" // 默认使用Java 17
		} catch (error) {
			console.warn("Could not detect Java version, defaulting to 17")
			return "17"
		}
	}

	/**
	 * 根据Java版本获取兼容的编译器插件版本
	 */
	getCompatibleCompilerPlugin(javaVersion: string): string {
		const version = parseInt(javaVersion)

		if (version >= 17) {
			return "3.11.0" // 支持Java 17+
		} else if (version >= 11) {
			return "3.8.1" // 支持Java 11
		} else {
			return "3.8.0" // 支持Java 8
		}
	}

	/**
	 * 根据Java版本获取兼容的Spring Boot版本
	 */
	getCompatibleSpringBootVersion(javaVersion: string): string {
		const version = parseInt(javaVersion)

		if (version >= 17) {
			return "3.2.0" // Spring Boot 3.x 要求Java 17+
		} else if (version >= 11) {
			return "2.7.18" // Spring Boot 2.7.x 支持Java 11
		} else {
			return "2.7.18" // Spring Boot 2.7.x 也支持Java 8
		}
	}

	/**
	 * 生成完整的pom.xml配置
	 */
	generatePomXml(
		config: MavenConfig,
		projectInfo: {
			groupId: string
			artifactId: string
			version: string
			name?: string
			description?: string
		},
	): string {
		const driverGroupId = config.mysqlDriverType === "mysql-connector-java" ? "mysql" : "com.mysql"

		return `<?xml version="1.0" encoding="UTF-8"?>
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
        <version>${config.springBootVersion}</version>
        <relativePath/>
    </parent>

    <properties>
        <java.version>${config.javaVersion}</java.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <project.reporting.outputEncoding>UTF-8</project.reporting.outputEncoding>
        <mybatis.version>${config.mybatisVersion || "3.5.15"}</mybatis.version>
        <mybatis.spring.version>${config.mybatisSpringVersion || "2.3.1"}</mybatis.spring.version>
        <lombok.version>${config.lombokVersion || "1.16.20"}</lombok.version>
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
            <groupId>${driverGroupId}</groupId>
            <artifactId>${config.mysqlDriverType}</artifactId>
            <version>${config.mysqlDriverVersion}</version>
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
                <version>${config.compilerPluginVersion}</version>
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
	}

	/**
	 * 验证Java兼容性
	 */
	async validateJavaCompatibility(cwd: string): Promise<{
		compatible: boolean
		detectedVersion: string
		issues: string[]
		recommendations: string[]
	}> {
		const issues: string[] = []
		const recommendations: string[] = []

		try {
			const detectedVersion = await this.detectJavaVersion()
			const version = parseInt(detectedVersion)

			// 检查是否为支持的版本
			if (version < 8) {
				issues.push(`Java版本过低: ${detectedVersion}，至少需要Java 8`)
				recommendations.push("升级到Java 8或更高版本")
			}

			// 检查pom.xml是否存在兼容性问题
			const pomPath = path.join(cwd, "pom.xml")
			if (fs.existsSync(pomPath)) {
				const pomContent = fs.readFileSync(pomPath, "utf-8")

				// 检查编译器插件版本
				const compilerPluginMatch = pomContent.match(
					/<artifactId>maven-compiler-plugin<\/artifactId>\s*<version>([^<]+)<\/version>/,
				)
				if (compilerPluginMatch) {
					const pluginVersion = compilerPluginMatch[1]
					if (version >= 17 && pluginVersion < "3.11.0") {
						issues.push(`Maven编译器插件版本${pluginVersion}与Java ${detectedVersion}不兼容`)
						recommendations.push("升级maven-compiler-plugin到3.11.0或更高版本")
					}
				}

				// 检查MySQL驱动
				if (pomContent.includes("mysql-connector-java") && !pomContent.includes("mysql-connector-j")) {
					issues.push("使用过时的MySQL驱动mysql-connector-java")
					recommendations.push("更换为mysql-connector-j驱动")
				}
			}

			return {
				compatible: issues.length === 0,
				detectedVersion,
				issues,
				recommendations,
			}
		} catch (error) {
			issues.push(`Java兼容性检查失败: ${error instanceof Error ? error.message : String(error)}`)
			return {
				compatible: false,
				detectedVersion: "unknown",
				issues,
				recommendations: ["确保Java已正确安装并在PATH中"],
			}
		}
	}

	/**
	 * 生成项目配置并保存到文件
	 */
	async generateAndSaveConfig(
		cwd: string,
		projectInfo: {
			groupId: string
			artifactId: string
			version: string
			name?: string
			description?: string
		},
		javaVersion?: string,
		useStandardConfig?: boolean,
	): Promise<ProjectConfigGenerationResult> {
		const warnings: string[] = []
		const errors: string[] = []

		try {
			// 生成配置
			const config = await this.generateMavenConfig(cwd, javaVersion, useStandardConfig)

			// 如果使用标准配置，跳过兼容性检查（因为标准配置已经是经过验证的）
			if (!useStandardConfig) {
				const compatibility = await this.validateJavaCompatibility(cwd)
				if (!compatibility.compatible) {
					warnings.push(...compatibility.issues)
				}
			}

			// 生成pom.xml内容
			const pomContent = this.generatePomXml(config, projectInfo)

			// 保存到文件
			const pomPath = path.join(cwd, "pom.xml")
			fs.writeFileSync(pomPath, pomContent, "utf-8")

			return {
				success: true,
				pomXmlPath: pomPath,
				generatedConfig: config,
				warnings,
				errors,
			}
		} catch (error) {
			errors.push(`配置生成失败: ${error instanceof Error ? error.message : String(error)}`)
			return {
				success: false,
				generatedConfig: useStandardConfig
					? this.generateStandardMavenConfig()
					: {
							javaVersion: javaVersion || "17",
							compilerPluginVersion: "3.11.0",
							mysqlDriverType: "mysql-connector-j",
							mysqlDriverVersion: "8.0.33",
						},
				warnings,
				errors,
			}
		}
	}

	/**
	 * 生成符合技术栈约定的项目配置并保存到文件
	 * 使用执行计划中定义的标准技术栈
	 */
	async generateStandardConfig(
		cwd: string,
		projectInfo: {
			groupId: string
			artifactId: string
			version: string
			name?: string
			description?: string
		},
	): Promise<ProjectConfigGenerationResult> {
		return this.generateAndSaveConfig(cwd, projectInfo, undefined, true)
	}
}
