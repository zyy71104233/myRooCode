import * as fs from "fs"
import * as path from "path"
import { ProjectConfigGenerator, MavenConfig } from "./ProjectConfigGenerator"
import { TestConsistencyValidator, TestValidationResult } from "./TestConsistencyValidator"
import { DatabaseSchemaGenerator } from "./DatabaseSchemaGenerator"
import { RepositoryInterfaceGenerator } from "./RepositoryInterfaceGenerator"

export interface ValidationResult {
	passed: boolean
	score: number
	issues: string[]
	warnings: string[]
	recommendations: string[]
	details: {
		mavenConfig?: any
		testConsistency?: TestValidationResult
		databaseSchema?: any
		repositoryConsistency?: any
	}
}

export interface FixSuggestion {
	type: "maven" | "test" | "database" | "repository" | "general"
	priority: "high" | "medium" | "low"
	title: string
	description: string
	autoFixable: boolean
	fixCode?: string
}

/**
 * DDD最佳实践检查器 - 整合所有验证功能
 * 基于certificate_issues_combined.md中的所有问题
 */
export class DDDBestPracticeChecker {
	private projectConfigGenerator = new ProjectConfigGenerator()
	private testConsistencyValidator = new TestConsistencyValidator()
	private databaseSchemaGenerator = new DatabaseSchemaGenerator()
	private repositoryInterfaceGenerator = new RepositoryInterfaceGenerator()

	/**
	 * 检查Maven配置是否符合最佳实践
	 */
	async checkMavenConfiguration(pomXmlPath: string): Promise<ValidationResult> {
		const issues: string[] = []
		const warnings: string[] = []
		const recommendations: string[] = []

		try {
			if (!fs.existsSync(pomXmlPath)) {
				issues.push("pom.xml文件不存在")
				recommendations.push("创建Maven配置文件")
				return {
					passed: false,
					score: 0,
					issues,
					warnings,
					recommendations,
					details: {},
				}
			}

			const pomContent = fs.readFileSync(pomXmlPath, "utf-8")

			// 检查Java兼容性
			const cwd = path.dirname(pomXmlPath)
			const compatibility = await this.projectConfigGenerator.validateJavaCompatibility(cwd)

			if (!compatibility.compatible) {
				issues.push(...compatibility.issues)
				recommendations.push(...compatibility.recommendations)
			}

			// 检查Maven编译器插件版本
			const compilerPluginMatch = pomContent.match(
				/<artifactId>maven-compiler-plugin<\/artifactId>\s*<version>([^<]+)<\/version>/,
			)
			if (compilerPluginMatch) {
				const version = compilerPluginMatch[1]
				const javaVersion = parseInt(compatibility.detectedVersion)

				if (javaVersion >= 17 && version < "3.11.0") {
					issues.push(`Maven编译器插件版本${version}与Java ${compatibility.detectedVersion}不兼容`)
					recommendations.push("升级maven-compiler-plugin到3.11.0或更高版本")
				}
			} else {
				warnings.push("未找到maven-compiler-plugin配置")
				recommendations.push("添加maven-compiler-plugin配置")
			}

			// 检查MySQL驱动
			if (pomContent.includes("mysql-connector-java") && !pomContent.includes("mysql-connector-j")) {
				issues.push("使用过时的MySQL驱动mysql-connector-java")
				recommendations.push("更换为mysql-connector-j驱动")
			}

			// 检查Spring Boot版本与Java版本的兼容性
			const springBootMatch = pomContent.match(
				/<groupId>org\.springframework\.boot<\/groupId>\s*<artifactId>spring-boot-starter-parent<\/artifactId>\s*<version>([^<]+)<\/version>/,
			)
			if (springBootMatch) {
				const springBootVersion = springBootMatch[1]
				const javaVersion = parseInt(compatibility.detectedVersion)

				if (javaVersion >= 17 && springBootVersion.startsWith("2.")) {
					warnings.push(`Java ${compatibility.detectedVersion}建议使用Spring Boot 3.x版本`)
					recommendations.push("考虑升级到Spring Boot 3.x以获得更好的Java 17+支持")
				}
			}

			const score = Math.max(0, 100 - issues.length * 25 - warnings.length * 10)

			return {
				passed: issues.length === 0,
				score,
				issues,
				warnings,
				recommendations,
				details: {
					mavenConfig: {
						javaVersion: compatibility.detectedVersion,
						compatible: compatibility.compatible,
					},
				},
			}
		} catch (error) {
			issues.push(`检查Maven配置时出错: ${error instanceof Error ? error.message : String(error)}`)
			return {
				passed: false,
				score: 0,
				issues,
				warnings,
				recommendations,
				details: {},
			}
		}
	}

	/**
	 * 检查数据库脚本是否符合最佳实践
	 */
	checkDatabaseSchema(schemaPath: string): ValidationResult {
		const issues: string[] = []
		const warnings: string[] = []
		const recommendations: string[] = []

		try {
			if (!fs.existsSync(schemaPath)) {
				warnings.push("数据库schema文件不存在")
				recommendations.push("创建数据库schema文件")
				return {
					passed: true,
					score: 80,
					issues,
					warnings,
					recommendations,
					details: {},
				}
			}

			const analysis = this.databaseSchemaGenerator.analyzeExistingSchema(schemaPath)

			issues.push(...analysis.issues)
			recommendations.push(...analysis.recommendations)

			const score = analysis.mysqlCompatible ? 100 : Math.max(0, 100 - issues.length * 20)

			return {
				passed: analysis.mysqlCompatible,
				score,
				issues,
				warnings,
				recommendations,
				details: {
					databaseSchema: analysis,
				},
			}
		} catch (error) {
			issues.push(`检查数据库schema时出错: ${error instanceof Error ? error.message : String(error)}`)
			return {
				passed: false,
				score: 0,
				issues,
				warnings,
				recommendations,
				details: {},
			}
		}
	}

	/**
	 * 检查Repository接口与实现的一致性
	 */
	checkRepositoryConsistency(repositoryInterfacePath: string, mapperImplementationPath: string): ValidationResult {
		const issues: string[] = []
		const warnings: string[] = []
		const recommendations: string[] = []

		try {
			if (!fs.existsSync(repositoryInterfacePath)) {
				warnings.push("Repository接口文件不存在")
				return {
					passed: true,
					score: 80,
					issues,
					warnings,
					recommendations,
					details: {},
				}
			}

			if (!fs.existsSync(mapperImplementationPath)) {
				warnings.push("Mapper实现文件不存在")
				return {
					passed: true,
					score: 80,
					issues,
					warnings,
					recommendations,
					details: {},
				}
			}

			const consistency = this.repositoryInterfaceGenerator.validateInterfaceConsistency(
				repositoryInterfacePath,
				mapperImplementationPath,
			)

			issues.push(...consistency.issues)
			recommendations.push(...consistency.suggestions)

			// 检查是否使用了通用方法名
			const interfaceContent = fs.readFileSync(repositoryInterfacePath, "utf-8")
			const genericMethods = ["findById", "deleteById", "existsById"]

			genericMethods.forEach((method) => {
				if (interfaceContent.includes(method)) {
					warnings.push(`使用了通用方法名: ${method}`)
					recommendations.push(`考虑使用更具业务含义的方法名替代${method}`)
				}
			})

			const score = consistency.isConsistent ? 100 : Math.max(0, 100 - issues.length * 15 - warnings.length * 5)

			return {
				passed: consistency.isConsistent && warnings.length === 0,
				score,
				issues,
				warnings,
				recommendations,
				details: {
					repositoryConsistency: consistency,
				},
			}
		} catch (error) {
			issues.push(`检查Repository一致性时出错: ${error instanceof Error ? error.message : String(error)}`)
			return {
				passed: false,
				score: 0,
				issues,
				warnings,
				recommendations,
				details: {},
			}
		}
	}

	/**
	 * 检查测试与模型的对齐情况
	 */
	checkTestModelAlignment(modelPath: string, testPath: string): ValidationResult {
		const issues: string[] = []
		const warnings: string[] = []
		const recommendations: string[] = []

		try {
			if (!fs.existsSync(modelPath)) {
				warnings.push("模型文件不存在")
				return {
					passed: true,
					score: 80,
					issues,
					warnings,
					recommendations,
					details: {},
				}
			}

			if (!fs.existsSync(testPath)) {
				warnings.push("测试文件不存在")
				recommendations.push("创建对应的测试文件")
				return {
					passed: false,
					score: 60,
					issues,
					warnings,
					recommendations,
					details: {},
				}
			}

			const validation = this.testConsistencyValidator.validateTestModelAlignment(modelPath, testPath)

			issues.push(...validation.issues)
			recommendations.push(...validation.recommendations)

			const score = validation.consistent ? 100 : Math.max(0, 100 - issues.length * 15)

			return {
				passed: validation.consistent,
				score,
				issues,
				warnings,
				recommendations,
				details: {
					testConsistency: validation,
				},
			}
		} catch (error) {
			issues.push(`检查测试模型对齐时出错: ${error instanceof Error ? error.message : String(error)}`)
			return {
				passed: false,
				score: 0,
				issues,
				warnings,
				recommendations,
				details: {},
			}
		}
	}

	/**
	 * 综合检查项目的DDD最佳实践
	 */
	async checkProjectBestPractices(projectPath: string): Promise<ValidationResult> {
		const allIssues: string[] = []
		const allWarnings: string[] = []
		const allRecommendations: string[] = []
		const details: any = {}

		// 检查Maven配置
		const pomPath = path.join(projectPath, "pom.xml")
		const mavenResult = await this.checkMavenConfiguration(pomPath)
		allIssues.push(...mavenResult.issues)
		allWarnings.push(...mavenResult.warnings)
		allRecommendations.push(...mavenResult.recommendations)
		details.maven = mavenResult.details

		// 检查数据库schema
		const schemaPath = path.join(projectPath, "src", "main", "resources", "schema.sql")
		const schemaResult = this.checkDatabaseSchema(schemaPath)
		allIssues.push(...schemaResult.issues)
		allWarnings.push(...schemaResult.warnings)
		allRecommendations.push(...schemaResult.recommendations)
		details.database = schemaResult.details

		// 检查Repository一致性（示例）
		const repositoryDir = path.join(projectPath, "src", "main", "java")
		if (fs.existsSync(repositoryDir)) {
			// 简单扫描Repository文件
			this.scanRepositoryFiles(repositoryDir).forEach(({ interfacePath, implPath }) => {
				const repoResult = this.checkRepositoryConsistency(interfacePath, implPath)
				allIssues.push(...repoResult.issues)
				allWarnings.push(...repoResult.warnings)
				allRecommendations.push(...repoResult.recommendations)
			})
		}

		// 计算总体得分
		const totalChecks = 4 // Maven, Database, Repository, Tests
		const passedChecks = [mavenResult, schemaResult].filter((r) => r.passed).length
		const overallScore = Math.round((passedChecks / totalChecks) * 100)

		return {
			passed: allIssues.length === 0,
			score: overallScore,
			issues: allIssues,
			warnings: allWarnings,
			recommendations: allRecommendations,
			details,
		}
	}

	/**
	 * 为发现的问题生成修复建议
	 */
	generateFixSuggestions(validationResult: ValidationResult): FixSuggestion[] {
		const suggestions: FixSuggestion[] = []

		// Maven相关修复建议
		validationResult.issues.forEach((issue) => {
			if (issue.includes("Maven编译器插件版本")) {
				suggestions.push({
					type: "maven",
					priority: "high",
					title: "升级Maven编译器插件",
					description: "将maven-compiler-plugin升级到3.11.0或更高版本以支持Java 17+",
					autoFixable: true,
					fixCode: `
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <version>3.11.0</version>
    <configuration>
        <source>\${java.version}</source>
        <target>\${java.version}</target>
    </configuration>
</plugin>`,
				})
			}

			if (issue.includes("mysql-connector-java")) {
				suggestions.push({
					type: "maven",
					priority: "high",
					title: "更新MySQL驱动",
					description: "使用新版mysql-connector-j替换过时的mysql-connector-java",
					autoFixable: true,
					fixCode: `
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <version>8.0.33</version>
    <scope>runtime</scope>
</dependency>`,
				})
			}
		})

		// 数据库相关修复建议
		validationResult.issues.forEach((issue) => {
			if (issue.includes("索引长度") && issue.includes("超过MySQL限制")) {
				suggestions.push({
					type: "database",
					priority: "high",
					title: "修复索引长度问题",
					description: "为长字段使用前缀索引或改为TEXT类型",
					autoFixable: true,
					fixCode: `-- 使用前缀索引
UNIQUE KEY idx_field_name (field_name(255))

-- 或者改为TEXT类型
field_name TEXT NOT NULL,
UNIQUE KEY idx_field_name (field_name(255))`,
				})
			}
		})

		// Repository相关修复建议
		validationResult.issues.forEach((issue) => {
			if (issue.includes("实现类缺少方法")) {
				suggestions.push({
					type: "repository",
					priority: "medium",
					title: "补充Repository实现方法",
					description: "确保Repository实现类包含接口中定义的所有方法",
					autoFixable: false,
				})
			}
		})

		// 测试相关修复建议
		validationResult.issues.forEach((issue) => {
			if (issue.includes("构造器参数数量不匹配")) {
				suggestions.push({
					type: "test",
					priority: "medium",
					title: "修复测试构造器调用",
					description: "确保测试中的构造器调用与模型类的构造器参数匹配",
					autoFixable: false,
				})
			}

			if (issue.includes("值对象测试中使用了getId()方法")) {
				suggestions.push({
					type: "test",
					priority: "medium",
					title: "修复值对象测试方法",
					description: "值对象应该使用value()方法而不是getId()方法",
					autoFixable: true,
					fixCode: `// 错误用法
assertThat(valueObject.getId()).isNotNull();

// 正确用法
assertThat(valueObject.value()).isEqualTo(expectedValue);`,
				})
			}
		})

		return suggestions
	}

	/**
	 * 扫描Repository文件
	 */
	private scanRepositoryFiles(javaDir: string): Array<{ interfacePath: string; implPath: string }> {
		const results: Array<{ interfacePath: string; implPath: string }> = []

		try {
			const findJavaFiles = (dir: string): string[] => {
				const files: string[] = []
				const items = fs.readdirSync(dir)

				for (const item of items) {
					const fullPath = path.join(dir, item)
					const stat = fs.statSync(fullPath)

					if (stat.isDirectory()) {
						files.push(...findJavaFiles(fullPath))
					} else if (item.endsWith(".java")) {
						files.push(fullPath)
					}
				}

				return files
			}

			const javaFiles = findJavaFiles(javaDir)
			const repositoryInterfaces = javaFiles.filter(
				(file) => file.includes("Repository.java") && file.includes("domain/repository"),
			)

			repositoryInterfaces.forEach((interfacePath) => {
				const fileName = path.basename(interfacePath, ".java")
				const entityName = fileName.replace("Repository", "")

				// 查找对应的实现文件
				const implPath = javaFiles.find(
					(file) =>
						file.includes(`MyBatis${entityName}Repository.java`) ||
						file.includes(`${entityName}RepositoryImpl.java`),
				)

				if (implPath) {
					results.push({ interfacePath, implPath })
				}
			})
		} catch (error) {
			console.warn(`扫描Repository文件时出错: ${error instanceof Error ? error.message : String(error)}`)
		}

		return results
	}
}
