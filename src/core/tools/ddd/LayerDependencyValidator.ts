import * as fs from "fs"
import * as path from "path"
import { TechStackContext } from "./TechStackContext"

/**
 * DDD层级类型定义
 * DDD layer type definition
 */
export type DddLayer = "config" | "domain" | "infrastructure" | "application" | "interface"

/**
 * 层级验证结果接口
 * Layer validation result interface
 */
export interface LayerValidationResult {
	canProceed: boolean // 是否可以继续 / Whether can proceed
	missingDependencies: string[] // 缺少的依赖层级 / Missing dependency layers
	missingFiles: string[] // 缺少的文件 / Missing files
	warnings: string[] // 警告信息 / Warning messages
	recommendations: string[] // 建议操作 / Recommended actions
}

/**
 * 文件检查结果接口
 * File check result interface
 */
export interface FileCheckResult {
	exists: boolean // 文件是否存在 / Whether file exists
	path: string // 文件路径 / File path
	valid: boolean // 文件是否有效 / Whether file is valid
	issues: string[] // 发现的问题 / Issues found
}

/**
 * DDD层级依赖验证器
 * DDD Layer Dependency Validator
 *
 * 确保DDD架构层级按正确顺序实施并验证前置条件，防止：
 * Ensures DDD architecture layers are implemented in correct order and validates prerequisites, preventing:
 * 1. 跳级实施（如：跳过config直接实施domain）/ Skipping layers (e.g., implementing domain without config)
 * 2. 缺少必需文件（如：基础设施层缺少数据库配置）/ Missing required files (e.g., infrastructure layer without database config)
 * 3. 技术栈约定违规（如：使用错误的Java版本）/ Tech stack convention violations (e.g., wrong Java version)
 *
 * DDD层级依赖关系 / DDD Layer Dependencies:
 * config → domain → infrastructure → application → interface
 *
 * @author DDD Framework
 * @version 1.0.0
 * @since 2024-12-22
 */
export class LayerDependencyValidator {
	/**
	 * DDD层级依赖关系定义
	 * DDD layer dependency definitions
	 *
	 * 定义每个层级实施前必须完成的前置层级
	 * Defines prerequisite layers that must be completed before implementing each layer
	 */
	private static readonly LAYER_DEPENDENCIES: Record<DddLayer, DddLayer[]> = {
		config: [],
		domain: ["config"],
		infrastructure: ["config", "domain"],
		application: ["config", "domain", "infrastructure"],
		interface: ["config", "domain", "infrastructure", "application"],
	}

	/**
	 * 每个层级必需的文件
	 */
	private static readonly REQUIRED_FILES: Record<DddLayer, string[]> = {
		config: ["pom.xml", "src/main/resources/application.yml", "src/main/resources/schema.sql"],
		domain: ["src/main/java/com/certmgr/domain/model", "src/main/java/com/certmgr/domain/repository"],
		infrastructure: [
			"src/main/java/com/certmgr/infrastructure/repository",
			"src/main/java/com/certmgr/infrastructure/config",
		],
		application: ["src/main/java/com/certmgr/application/service", "src/main/java/com/certmgr/application/dto"],
		interface: ["src/main/java/com/certmgr/interfaces/rest", "src/main/java/com/certmgr/interfaces/dto"],
	}

	/**
	 * 验证指定层级是否可以开始实施
	 */
	async validateLayerCanStart(cwd: string, targetLayer: DddLayer): Promise<LayerValidationResult> {
		const result: LayerValidationResult = {
			canProceed: true,
			missingDependencies: [],
			missingFiles: [],
			warnings: [],
			recommendations: [],
		}

		// 1. 检查层级依赖
		await this.checkLayerDependencies(cwd, targetLayer, result)

		// 2. 检查必需文件
		await this.checkRequiredFiles(cwd, targetLayer, result)

		// 3. 特殊检查
		await this.performSpecialChecks(cwd, targetLayer, result)

		result.canProceed = result.missingDependencies.length === 0 && result.missingFiles.length === 0

		return result
	}

	/**
	 * 检查层级依赖关系
	 */
	private async checkLayerDependencies(
		cwd: string,
		targetLayer: DddLayer,
		result: LayerValidationResult,
	): Promise<void> {
		const dependencies = LayerDependencyValidator.LAYER_DEPENDENCIES[targetLayer]

		for (const depLayer of dependencies) {
			const isComplete = await this.isLayerComplete(cwd, depLayer)
			if (!isComplete) {
				result.missingDependencies.push(depLayer)
				result.recommendations.push(`请先完成 ${depLayer} 层的实施`)
			}
		}
	}

	/**
	 * 检查必需文件
	 */
	private async checkRequiredFiles(cwd: string, targetLayer: DddLayer, result: LayerValidationResult): Promise<void> {
		// 检查当前层级的前置层级的必需文件
		const dependencies = LayerDependencyValidator.LAYER_DEPENDENCIES[targetLayer]

		for (const depLayer of dependencies) {
			const requiredFiles = LayerDependencyValidator.REQUIRED_FILES[depLayer]

			for (const file of requiredFiles) {
				const filePath = path.join(cwd, file)
				const fileCheck = await this.checkFile(filePath, file)

				if (!fileCheck.exists) {
					result.missingFiles.push(file)
					result.recommendations.push(`需要创建文件: ${file}`)
				} else if (!fileCheck.valid) {
					result.warnings.push(`文件存在但可能有问题: ${file}`)
					result.warnings.push(...fileCheck.issues)
				}
			}
		}
	}

	/**
	 * 执行特殊检查
	 */
	private async performSpecialChecks(
		cwd: string,
		targetLayer: DddLayer,
		result: LayerValidationResult,
	): Promise<void> {
		switch (targetLayer) {
			case "domain":
				await this.checkConfigLayerCompleteness(cwd, result)
				break

			case "infrastructure":
				await this.checkDatabaseConfiguration(cwd, result)
				await this.checkDomainLayerCompleteness(cwd, result)
				break

			case "application":
				await this.checkInfrastructureLayerCompleteness(cwd, result)
				break

			case "interface":
				await this.checkApplicationLayerCompleteness(cwd, result)
				break
		}
	}

	/**
	 * 检查配置层完整性
	 */
	private async checkConfigLayerCompleteness(cwd: string, result: LayerValidationResult): Promise<void> {
		// 检查 pom.xml 是否符合技术栈约定
		const pomPath = path.join(cwd, "pom.xml")
		if (fs.existsSync(pomPath)) {
			const pomContent = fs.readFileSync(pomPath, "utf-8")

			// 验证Java版本
			if (!pomContent.includes("<java.version>8</java.version>")) {
				result.warnings.push("pom.xml 中的Java版本不是8，可能不符合技术栈约定")
				result.recommendations.push("请确认Java版本设置为8")
			}

			// 验证Spring Boot版本
			if (!pomContent.includes("<version>2.7.18</version>")) {
				result.warnings.push("Spring Boot版本可能不是2.7.18")
				result.recommendations.push("请确认Spring Boot版本为2.7.18")
			}
		}

		// 检查数据库配置
		const appYmlPath = path.join(cwd, "src", "main", "resources", "application.yml")
		if (fs.existsSync(appYmlPath)) {
			const ymlContent = fs.readFileSync(appYmlPath, "utf-8")
			if (!ymlContent.includes("datasource:") || !ymlContent.includes("mybatis:")) {
				result.warnings.push("application.yml 缺少完整的数据库配置")
				result.recommendations.push("请确保application.yml包含数据源和MyBatis配置")
			}
		}
	}

	/**
	 * 检查数据库配置
	 */
	private async checkDatabaseConfiguration(cwd: string, result: LayerValidationResult): Promise<void> {
		const appYmlPath = path.join(cwd, "src", "main", "resources", "application.yml")

		if (!fs.existsSync(appYmlPath)) {
			result.missingFiles.push("src/main/resources/application.yml")
			result.recommendations.push("基础设施层需要数据库配置，请先创建application.yml")
			return
		}

		const ymlContent = fs.readFileSync(appYmlPath, "utf-8")

		// 检查必需的数据库配置项
		const requiredConfigs = [
			"datasource:",
			"url:",
			"username:",
			"password:",
			"driver-class-name:",
			"mybatis:",
			"mapper-locations:",
			"type-aliases-package:",
		]

		for (const config of requiredConfigs) {
			if (!ymlContent.includes(config)) {
				result.warnings.push(`application.yml 缺少配置项: ${config}`)
				result.recommendations.push(`请在application.yml中添加 ${config} 配置`)
			}
		}
	}

	/**
	 * 检查领域层完整性
	 */
	private async checkDomainLayerCompleteness(cwd: string, result: LayerValidationResult): Promise<void> {
		const domainModelPath = path.join(cwd, "src", "main", "java", "com", "certmgr", "domain", "model")
		const domainRepoPath = path.join(cwd, "src", "main", "java", "com", "certmgr", "domain", "repository")

		if (!fs.existsSync(domainModelPath) || !this.hasJavaFiles(domainModelPath)) {
			result.warnings.push("领域模型目录为空或不存在")
			result.recommendations.push("请先创建领域实体和值对象")
		}

		if (!fs.existsSync(domainRepoPath) || !this.hasJavaFiles(domainRepoPath)) {
			result.warnings.push("领域仓储接口目录为空或不存在")
			result.recommendations.push("请先定义仓储接口")
		}
	}

	/**
	 * 检查基础设施层完整性
	 */
	private async checkInfrastructureLayerCompleteness(cwd: string, result: LayerValidationResult): Promise<void> {
		const infraRepoPath = path.join(cwd, "src", "main", "java", "com", "certmgr", "infrastructure", "repository")
		const mapperPath = path.join(cwd, "src", "main", "resources", "mapper")

		if (!fs.existsSync(infraRepoPath) || !this.hasJavaFiles(infraRepoPath)) {
			result.warnings.push("基础设施仓储实现目录为空或不存在")
			result.recommendations.push("请先实现仓储接口")
		}

		if (!fs.existsSync(mapperPath) || !this.hasXmlFiles(mapperPath)) {
			result.warnings.push("MyBatis映射文件目录为空或不存在")
			result.recommendations.push("请创建MyBatis映射文件")
		}
	}

	/**
	 * 检查应用层完整性
	 */
	private async checkApplicationLayerCompleteness(cwd: string, result: LayerValidationResult): Promise<void> {
		const appServicePath = path.join(cwd, "src", "main", "java", "com", "certmgr", "application", "service")

		if (!fs.existsSync(appServicePath) || !this.hasJavaFiles(appServicePath)) {
			result.warnings.push("应用服务目录为空或不存在")
			result.recommendations.push("请先创建应用服务")
		}
	}

	/**
	 * 检查层级是否完成
	 */
	private async isLayerComplete(cwd: string, layer: DddLayer): Promise<boolean> {
		const requiredFiles = LayerDependencyValidator.REQUIRED_FILES[layer]

		for (const file of requiredFiles) {
			const filePath = path.join(cwd, file)
			if (!fs.existsSync(filePath)) {
				return false
			}

			// 对于目录，检查是否有内容
			if (fs.statSync(filePath).isDirectory()) {
				if (layer === "config") continue // 配置层的目录可以为空

				if (!this.hasJavaFiles(filePath) && !this.hasXmlFiles(filePath)) {
					return false
				}
			}
		}

		return true
	}

	/**
	 * 检查文件
	 */
	private async checkFile(filePath: string, fileName: string): Promise<FileCheckResult> {
		const result: FileCheckResult = {
			exists: fs.existsSync(filePath),
			path: filePath,
			valid: true,
			issues: [],
		}

		if (!result.exists) {
			return result
		}

		// 根据文件类型进行特殊检查
		if (fileName === "pom.xml") {
			result.valid = await this.validatePomXml(filePath, result.issues)
		} else if (fileName.endsWith("application.yml")) {
			result.valid = await this.validateApplicationYml(filePath, result.issues)
		} else if (fileName.endsWith("schema.sql")) {
			result.valid = await this.validateSchemaSql(filePath, result.issues)
		}

		return result
	}

	/**
	 * 验证 pom.xml 文件
	 */
	private async validatePomXml(filePath: string, issues: string[]): Promise<boolean> {
		try {
			const content = fs.readFileSync(filePath, "utf-8")
			const techStack = TechStackContext.getStandardStack()

			// 检查关键配置
			if (!content.includes(`<java.version>${techStack.javaVersion}</java.version>`)) {
				issues.push(`Java版本应为${techStack.javaVersion}`)
			}

			if (!content.includes(`<version>${techStack.springBootVersion}</version>`)) {
				issues.push(`Spring Boot版本应为${techStack.springBootVersion}`)
			}

			if (!content.includes("mysql-connector-java")) {
				issues.push("缺少MySQL驱动依赖")
			}

			if (!content.includes("mybatis-spring-boot-starter")) {
				issues.push("缺少MyBatis Spring Boot Starter依赖")
			}

			return issues.length === 0
		} catch (error) {
			issues.push(`读取pom.xml失败: ${error instanceof Error ? error.message : String(error)}`)
			return false
		}
	}

	/**
	 * 验证 application.yml 文件
	 */
	private async validateApplicationYml(filePath: string, issues: string[]): Promise<boolean> {
		try {
			const content = fs.readFileSync(filePath, "utf-8")

			// 检查关键配置项
			if (!content.includes("datasource:")) {
				issues.push("缺少数据源配置")
			}

			if (!content.includes("mybatis:")) {
				issues.push("缺少MyBatis配置")
			}

			if (!content.includes("mysql")) {
				issues.push("数据源URL应指向MySQL")
			}

			return issues.length === 0
		} catch (error) {
			issues.push(`读取application.yml失败: ${error instanceof Error ? error.message : String(error)}`)
			return false
		}
	}

	/**
	 * 验证 schema.sql 文件
	 */
	private async validateSchemaSql(filePath: string, issues: string[]): Promise<boolean> {
		try {
			const content = fs.readFileSync(filePath, "utf-8")

			// 检查是否包含基本的表结构
			if (!content.includes("CREATE TABLE")) {
				issues.push("SQL脚本应包含CREATE TABLE语句")
			}

			if (!content.includes("certificates")) {
				issues.push("应包含certificates表的定义")
			}

			return issues.length === 0
		} catch (error) {
			issues.push(`读取schema.sql失败: ${error instanceof Error ? error.message : String(error)}`)
			return false
		}
	}

	/**
	 * 检查目录是否包含Java文件
	 */
	private hasJavaFiles(dirPath: string): boolean {
		if (!fs.existsSync(dirPath)) return false

		try {
			const files = fs.readdirSync(dirPath, { recursive: true })
			return files.some((file) => String(file).endsWith(".java"))
		} catch {
			return false
		}
	}

	/**
	 * 检查目录是否包含XML文件
	 */
	private hasXmlFiles(dirPath: string): boolean {
		if (!fs.existsSync(dirPath)) return false

		try {
			const files = fs.readdirSync(dirPath, { recursive: true })
			return files.some((file) => String(file).endsWith(".xml"))
		} catch {
			return false
		}
	}

	/**
	 * 获取层级顺序
	 */
	static getLayerOrder(): DddLayer[] {
		return ["config", "domain", "infrastructure", "application", "interface"]
	}

	/**
	 * 获取下一个应该实施的层级
	 */
	static getNextLayer(currentLayer: DddLayer): DddLayer | null {
		const order = this.getLayerOrder()
		const currentIndex = order.indexOf(currentLayer)

		if (currentIndex === -1 || currentIndex === order.length - 1) {
			return null
		}

		return order[currentIndex + 1]
	}
}
