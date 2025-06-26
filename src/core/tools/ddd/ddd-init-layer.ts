/**
 * DDD层级初始化工具（重写版本）
 * DDD Layer Initialization Tool (Rewritten Version)
 *
 * 完全重写的DDD层级初始化工具，集成了以下组件：
 * Completely rewritten DDD layer initialization tool, integrating the following components:
 *
 * 1. TechStackContext - 技术栈约定管理器
 * 2. ConfigFileGenerator - 配置文件生成器
 * 3. LayerDependencyValidator - 层级依赖验证器
 *
 * 核心改进 / Core Improvements:
 * - 强制技术栈约定（Java 8 + Spring Boot 2.7.18 + MyBatis）
 * - 层级依赖检查（config → domain → infrastructure → application → interface）
 * - 配置文件按序生成（pom.xml → application.yml → schema.sql）
 * - 详细状态反馈和下一步指导
 *
 * @author DDD Framework
 * @version 2.0.0
 * @since 2024-12-22
 */
import { Anthropic } from "@anthropic-ai/sdk"
import { ClineAsk, ToolName } from "@roo-code/types"
import { ConfigFileGenerator, ProjectInfo } from "./ConfigFileGenerator"
import { LayerDependencyValidator, DddLayer } from "./LayerDependencyValidator"
import { TechStackContext } from "./TechStackContext"
import * as path from "path"
import * as fs from "fs"

/**
 * DDD层级初始化参数接口
 * DDD layer initialization parameters interface
 */
export interface DddInitLayerParams {
	layer: "config" | "domain" | "infrastructure" | "application" | "interface" // 要初始化的层级 / Layer to initialize
	description?: string // 层级描述 / Layer description
	requirements?: string // 特殊需求 / Special requirements
}

/**
 * DDD层级初始化结果类型
 * DDD layer initialization result type
 */
export type DddInitLayerResult = {
	layer: string // 层级名称 / Layer name
	status: "initialized" | "already_active" | "error" | "blocked" // 初始化状态 / Initialization status
	message: string // 结果消息 / Result message
	nextSteps?: string[] // 下一步建议 / Next step recommendations
	filesGenerated?: string[] // 生成的文件列表 / List of generated files
	validationResult?: any // 验证结果 / Validation result
}

/**
 * 执行DDD层级初始化
 * Execute DDD layer initialization
 *
 * 重写版本的层级初始化函数，集成了技术栈约定、依赖验证和配置文件生成
 * Rewritten layer initialization function integrating tech stack conventions, dependency validation and config file generation
 *
 * 工作流程 / Workflow:
 * 1. 验证层级依赖关系和前置条件
 * 2. 检查技术栈约定兼容性
 * 3. 根据层级类型执行特定初始化逻辑
 * 4. 生成必要的配置文件和目录结构
 * 5. 提供详细的状态反馈和下一步指导
 *
 * @param {DddInitLayerParams} params - 初始化参数 / Initialization parameters
 * @param {string} cwd - 项目根目录 / Project root directory
 * @param {Function} askCallback - 用户交互回调 / User interaction callback
 * @param {Function} updateCallback - 状态更新回调 / Status update callback
 * @returns {Promise<string>} 初始化结果消息 / Initialization result message
 */
export async function executeDddInitLayer(
	params: DddInitLayerParams,
	cwd: string,
	askCallback: (type: ClineAsk, message?: string) => Promise<boolean>,
	updateCallback: (type: ToolName, content: string) => void,
): Promise<string> {
	try {
		updateCallback("ddd_init_layer", `🚀 正在初始化 ${params.layer} 层...`)

		// 1. 首先验证层级依赖
		const validator = new LayerDependencyValidator()
		const validationResult = await validator.validateLayerCanStart(cwd, params.layer as DddLayer)

		if (!validationResult.canProceed) {
			const errorMessage =
				`❌ 无法初始化 ${params.layer} 层，存在依赖问题:\n` +
				`缺少依赖层级: ${validationResult.missingDependencies.join(", ")}\n` +
				`缺少文件: ${validationResult.missingFiles.join(", ")}\n` +
				`建议: ${validationResult.recommendations.join(", ")}`

			updateCallback("ddd_init_layer", errorMessage)
			return errorMessage
		}

		// 2. 显示警告信息（如果有）
		if (validationResult.warnings.length > 0) {
			updateCallback("ddd_init_layer", `⚠️ 发现以下警告:\n${validationResult.warnings.join("\n")}`)
		}

		// 3. 根据层级类型执行具体的初始化
		let result: DddInitLayerResult

		switch (params.layer) {
			case "config":
				result = await initializeConfigLayer(cwd, updateCallback)
				break

			case "domain":
				result = await initializeDomainLayer(cwd, updateCallback, validationResult)
				break

			case "infrastructure":
				result = await initializeInfrastructureLayer(cwd, updateCallback, validationResult)
				break

			case "application":
				result = await initializeApplicationLayer(cwd, updateCallback, validationResult)
				break

			case "interface":
				result = await initializeInterfaceLayer(cwd, updateCallback, validationResult)
				break

			default:
				throw new Error(`未知的层级类型: ${params.layer}`)
		}

		// 4. 格式化输出结果
		let responseText = formatLayerResult(result)

		updateCallback("ddd_init_layer", responseText)
		return responseText
	} catch (error) {
		const errorMessage = `❌ 初始化 ${params.layer} 层时发生错误: ${error instanceof Error ? error.message : String(error)}`
		updateCallback("ddd_init_layer", errorMessage)
		return errorMessage
	}
}

/**
 * 初始化配置层
 * Initialize configuration layer
 *
 * 配置层是DDD架构的基础层，负责生成所有项目配置文件：
 * Configuration layer is the foundation of DDD architecture, responsible for generating all project configuration files:
 *
 * 生成内容 / Generated Content:
 * - pom.xml: Maven项目配置，严格遵循Java 8 + Spring Boot 2.7.18 + MyBatis技术栈
 * - application.yml: Spring Boot主配置文件，包含数据库连接和MyBatis设置
 * - application-dev.yml/application-prod.yml: 环境特定配置
 * - schema.sql: 数据库初始化脚本
 * - logback-spring.xml: 日志配置
 * - 标准DDD目录结构
 *
 * @param {string} cwd - 项目根目录 / Project root directory
 * @param {Function} updateCallback - 状态更新回调 / Status update callback
 * @returns {Promise<DddInitLayerResult>} 初始化结果 / Initialization result
 */
async function initializeConfigLayer(
	cwd: string,
	updateCallback: (type: ToolName, content: string) => void,
): Promise<DddInitLayerResult> {
	updateCallback("ddd_init_layer", "📋 正在按技术栈约定生成配置文件...")

	const configGenerator = new ConfigFileGenerator()
	const projectInfo: ProjectInfo = {
		groupId: "com.certmgr",
		artifactId: "certificate-management",
		version: "1.0-SNAPSHOT",
		name: "Certificate Management System",
		description: "基于DDD架构的证书管理系统，严格遵循技术栈约定",
		basePackage: "com.certmgr",
	}

	const result = await configGenerator.generateAllConfigFiles(cwd, projectInfo)

	if (result.success) {
		updateCallback("ddd_init_layer", "✅ 配置层初始化完成，所有配置文件已按技术栈约定生成")

		const nextLayer = LayerDependencyValidator.getNextLayer("config")
		const nextSteps = [
			"✅ pom.xml - 使用Java 8 + Spring Boot 2.7.18 + MyBatis技术栈",
			"✅ application.yml - 数据库连接和MyBatis配置",
			"✅ schema.sql - 证书管理数据库表结构",
			"✅ 标准目录结构已创建",
			nextLayer ? `下一步: 开始 ${nextLayer} 层的实施` : "所有层级可以开始实施",
		]

		return {
			layer: "config",
			status: "initialized",
			message: `✅ 配置层初始化成功`,
			nextSteps,
			filesGenerated: result.filesGenerated,
		}
	} else {
		return {
			layer: "config",
			status: "error",
			message: `❌ 配置层初始化失败: ${result.errors.join(", ")}`,
			nextSteps: [...result.errors, ...result.warnings],
		}
	}
}

/**
 * 初始化领域层
 * Initialize domain layer
 *
 * 领域层是DDD架构的核心，包含业务逻辑和领域规则：
 * Domain layer is the core of DDD architecture, containing business logic and domain rules:
 *
 * 主要组件 / Main Components:
 * - 领域实体（Entity）: 具有唯一标识的业务对象
 * - 值对象（Value Object）: 描述领域概念的不可变对象
 * - 领域服务（Domain Service）: 领域逻辑的封装
 * - 仓储接口（Repository Interface）: 数据访问的抽象
 *
 * 技术约定 / Technical Conventions:
 * - 使用Java 8语法和Lombok注解
 * - 遵循DDD战术设计模式
 * - 实体ID统一使用Long类型
 * - 所有字段使用@NotNull、@NotBlank等验证注解
 *
 * @param {string} cwd - 项目根目录 / Project root directory
 * @param {Function} updateCallback - 状态更新回调 / Status update callback
 * @param {any} validationResult - 依赖验证结果 / Dependency validation result
 * @returns {Promise<DddInitLayerResult>} 初始化结果 / Initialization result
 */
async function initializeDomainLayer(
	cwd: string,
	updateCallback: (type: ToolName, content: string) => void,
	validationResult: any,
): Promise<DddInitLayerResult> {
	updateCallback("ddd_init_layer", "🏗️ 正在初始化领域层...")

	// 检查技术栈约定
	const techStack = TechStackContext.getStandardStack()
	const packageStructure = TechStackContext.getStandardPackageStructure()

	updateCallback(
		"ddd_init_layer",
		`📦 使用技术栈: Java ${techStack.javaVersion}, Spring Boot ${techStack.springBootVersion}`,
	)

	const nextLayer = LayerDependencyValidator.getNextLayer("domain")

	return {
		layer: "domain",
		status: "initialized",
		message: "✅ 领域层已准备就绪",
		nextSteps: [
			"📍 当前阶段: 领域层实施",
			"🎯 任务: 创建领域实体、值对象和仓储接口",
			"📝 使用技术栈约定的注解和导入",
			"🔧 参考战术文档，先生成方法签名，再实现具体逻辑",
			nextLayer ? `下一步: ${nextLayer} 层` : "准备实施基础设施层",
			"⚠️ 注意: 所有代码必须符合Java 8语法和约定",
		],
		validationResult,
	}
}

/**
 * 初始化基础设施层
 * Initialize infrastructure layer
 *
 * 基础设施层提供技术实现和外部系统集成：
 * Infrastructure layer provides technical implementations and external system integrations:
 *
 * 主要组件 / Main Components:
 * - 仓储实现（Repository Implementation）: 使用MyBatis实现数据访问
 * - 数据库配置（Database Configuration）: 连接池和事务管理
 * - 外部服务适配器（External Service Adapters）: 第三方系统集成
 *
 * 技术实现 / Technical Implementation:
 * - MyBatis Mapper注解和XML映射
 * - HikariCP连接池配置
 * - MySQL传统驱动（com.mysql.jdbc.Driver）
 * - 事务管理和数据库迁移
 *
 * 前置条件 / Prerequisites:
 * - application.yml文件必须存在并包含数据库配置
 * - 领域层仓储接口必须已定义
 *
 * @param {string} cwd - 项目根目录 / Project root directory
 * @param {Function} updateCallback - 状态更新回调 / Status update callback
 * @param {any} validationResult - 依赖验证结果 / Dependency validation result
 * @returns {Promise<DddInitLayerResult>} 初始化结果 / Initialization result
 */
async function initializeInfrastructureLayer(
	cwd: string,
	updateCallback: (type: ToolName, content: string) => void,
	validationResult: any,
): Promise<DddInitLayerResult> {
	updateCallback("ddd_init_layer", "🔧 正在初始化基础设施层...")

	// 验证数据库配置是否存在
	const appYmlPath = path.join(cwd, "src", "main", "resources", "application.yml")
	if (!fs.existsSync(appYmlPath)) {
		return {
			layer: "infrastructure",
			status: "error",
			message: "❌ 基础设施层需要数据库配置",
			nextSteps: ["请先确保配置层(config)已完成", "application.yml 文件必须存在并包含数据库连接配置"],
		}
	}

	const nextLayer = LayerDependencyValidator.getNextLayer("infrastructure")

	return {
		layer: "infrastructure",
		status: "initialized",
		message: "✅ 基础设施层已准备就绪",
		nextSteps: [
			"📍 当前阶段: 基础设施层实施",
			"🎯 任务: 实现仓储接口、创建MyBatis映射文件",
			"📋 数据库配置已就绪，可以开始数据访问层开发",
			"🔗 使用MyBatis + MySQL组合，符合技术栈约定",
			"📝 基于领域层已有的接口，实现具体的数据访问逻辑",
			nextLayer ? `下一步: ${nextLayer} 层` : "准备实施应用层",
		],
		validationResult,
	}
}

/**
 * 初始化应用层
 * Initialize application layer
 *
 * 应用层负责业务流程编排和用例实现：
 * Application layer is responsible for business process orchestration and use case implementation:
 *
 * 主要组件 / Main Components:
 * - 应用服务（Application Service）: 业务用例的实现入口
 * - DTO（Data Transfer Object）: 应用层数据传输对象
 * - 业务流程编排（Business Process Orchestration）: 协调多个领域服务
 * - 事务管理（Transaction Management）: 跨聚合根的事务边界
 *
 * 设计原则 / Design Principles:
 * - 薄应用层：主要负责流程编排，不包含业务逻辑
 * - 事务边界：应用服务是事务的天然边界
 * - DTO转换：处理外部请求与领域对象的转换
 * - 异常处理：统一的应用层异常处理
 *
 * @param {string} cwd - 项目根目录 / Project root directory
 * @param {Function} updateCallback - 状态更新回调 / Status update callback
 * @param {any} validationResult - 依赖验证结果 / Dependency validation result
 * @returns {Promise<DddInitLayerResult>} 初始化结果 / Initialization result
 */
async function initializeApplicationLayer(
	cwd: string,
	updateCallback: (type: ToolName, content: string) => void,
	validationResult: any,
): Promise<DddInitLayerResult> {
	updateCallback("ddd_init_layer", "⚙️ 正在初始化应用层...")

	const nextLayer = LayerDependencyValidator.getNextLayer("application")

	return {
		layer: "application",
		status: "initialized",
		message: "✅ 应用层已准备就绪",
		nextSteps: [
			"📍 当前阶段: 应用层实施",
			"🎯 任务: 创建应用服务、DTO和业务流程编排",
			"🏗️ 依赖的基础设施层和领域层已就绪",
			"📝 基于已有的领域服务和仓储，编排业务流程",
			nextLayer ? `下一步: ${nextLayer} 层` : "准备实施接口层",
		],
		validationResult,
	}
}

/**
 * 初始化接口层
 * Initialize interface layer
 *
 * 接口层是DDD架构的最外层，负责与外部世界的交互：
 * Interface layer is the outermost layer of DDD architecture, responsible for interaction with the external world:
 *
 * 主要组件 / Main Components:
 * - REST控制器（REST Controller）: HTTP API接口的实现
 * - DTO转换器（DTO Converter）: 外部DTO与应用层DTO的转换
 * - 异常处理器（Exception Handler）: 全局异常处理和错误响应
 * - API文档（API Documentation）: Swagger/OpenAPI文档生成
 *
 * 技术实现 / Technical Implementation:
 * - Spring Web MVC注解（@RestController、@RequestMapping等）
 * - JSON序列化和反序列化
 * - HTTP状态码和响应格式标准化
 * - 请求验证和参数绑定
 *
 * @param {string} cwd - 项目根目录 / Project root directory
 * @param {Function} updateCallback - 状态更新回调 / Status update callback
 * @param {any} validationResult - 依赖验证结果 / Dependency validation result
 * @returns {Promise<DddInitLayerResult>} 初始化结果 / Initialization result
 */
async function initializeInterfaceLayer(
	cwd: string,
	updateCallback: (type: ToolName, content: string) => void,
	validationResult: any,
): Promise<DddInitLayerResult> {
	updateCallback("ddd_init_layer", "🌐 正在初始化接口层...")

	return {
		layer: "interface",
		status: "initialized",
		message: "✅ 接口层已准备就绪",
		nextSteps: [
			"📍 当前阶段: 接口层实施",
			"🎯 任务: 创建REST控制器、DTO转换和API文档",
			"🏁 这是DDD架构的最后一层",
			"📝 基于已有的应用服务，暴露HTTP接口",
			"✅ 完成后整个DDD架构就绪",
		],
		validationResult,
	}
}

/**
 * 格式化层级结果输出
 * Format layer result output
 *
 * 将层级初始化结果格式化为用户友好的文本输出，包含：
 * Format layer initialization result into user-friendly text output, including:
 *
 * 输出内容 / Output Content:
 * - 层级状态和消息 / Layer status and message
 * - 生成的文件列表 / List of generated files
 * - 下一步操作建议 / Next step recommendations
 * - 验证警告信息 / Validation warnings
 * - 技术栈约定提醒 / Tech stack convention reminders
 *
 * @param {DddInitLayerResult} result - 层级初始化结果 / Layer initialization result
 * @returns {string} 格式化的输出文本 / Formatted output text
 */
function formatLayerResult(result: DddInitLayerResult): string {
	let responseText = `🎯 ${result.layer} 层初始化 - ${result.status}\n\n`

	// 状态信息
	responseText += `${result.message}\n\n`

	// 生成的文件
	if (result.filesGenerated && result.filesGenerated.length > 0) {
		responseText += `📁 生成的文件:\n${result.filesGenerated.map((file) => `- ${file}`).join("\n")}\n\n`
	}

	// 下一步操作
	if (result.nextSteps && result.nextSteps.length > 0) {
		responseText += `📋 下一步操作:\n${result.nextSteps.map((step) => `- ${step}`).join("\n")}\n\n`
	}

	// 验证结果详情
	if (result.validationResult && result.validationResult.warnings.length > 0) {
		responseText += `⚠️ 验证警告:\n${result.validationResult.warnings.map((w: string) => `- ${w}`).join("\n")}\n\n`
	}

	// 通用提醒
	responseText += `💡 技术栈约定提醒:\n`
	responseText += `- Java 8 语法和注解\n`
	responseText += `- Spring Boot 2.7.18 + MyBatis 3.5.15\n`
	responseText += `- 遵循DDD层级依赖关系\n`
	responseText += `- 基于已有方法生成测试用例\n`

	return responseText
}

export function getDddInitLayerDescription(): string {
	return `Initialize a new DDD layer for development with comprehensive dependency validation and tech stack compliance.

This enhanced tool:
1. ✅ Validates layer dependencies before initialization
2. ✅ Generates complete configuration files for config layer
3. ✅ Enforces tech stack conventions (Java 8, Spring Boot 2.7.18, MyBatis)
4. ✅ Creates proper directory structure
5. ✅ Provides layer-specific guidance
6. ✅ Checks prerequisite files and configurations

Parameters:
- layer (required): The layer to initialize
  - "config": Project configuration, pom.xml, application.yml, schema.sql
  - "domain": Core business logic and domain model
  - "infrastructure": Data persistence and external services (requires config layer)
  - "application": Use cases and application services (requires infrastructure layer)
  - "interface": REST APIs and controllers (requires application layer)
- description (optional): Description of what will be implemented
- requirements (optional): Specific requirements for this layer

Layer Dependencies:
- config → (no dependencies)
- domain → config
- infrastructure → config + domain
- application → config + domain + infrastructure  
- interface → config + domain + infrastructure + application

Use this tool to properly initialize DDD layers in the correct order with full validation.`
}
