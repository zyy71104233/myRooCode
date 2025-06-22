import * as fs from "fs"
import * as path from "path"

export interface BusinessIdentifier {
	name: string
	type: string
	unique: boolean
	description: string
}

export interface RepositoryMethod {
	name: string
	returnType: string
	parameters: Array<{
		name: string
		type: string
	}>
	description: string
	businessRelevant: boolean
}

export interface RepositoryInterfaceDefinition {
	interfaceName: string
	entityName: string
	packageName: string
	businessIdentifiers: BusinessIdentifier[]
	methods: RepositoryMethod[]
	imports: string[]
}

export interface RepositoryGenerationResult {
	success: boolean
	interfaceFilePath?: string
	implementationFilePath?: string
	generatedInterface: RepositoryInterfaceDefinition
	warnings: string[]
	errors: string[]
}

/**
 * Repository接口生成工具 - 解决Repository接口设计问题
 * 基于certificate_issues_combined.md中的问题3.1
 */
export class RepositoryInterfaceGenerator {
	/**
	 * 分析聚合根的业务标识
	 */
	analyzeBusinessIdentifiers(entityFilePath: string): BusinessIdentifier[] {
		try {
			const content = fs.readFileSync(entityFilePath, "utf-8")
			const identifiers: BusinessIdentifier[] = []

			// 提取类名
			const classNameMatch = content.match(/class\s+(\w+)/)
			const className = classNameMatch ? classNameMatch[1] : "Entity"

			// 查找可能的业务标识字段
			const fieldMatches = content.match(/private\s+(\w+)\s+(\w+)\s*[;=]/g)
			if (fieldMatches) {
				fieldMatches.forEach((match) => {
					const parts = match.trim().split(/\s+/)
					if (parts.length >= 3) {
						const type = parts[1]
						const name = parts[2].replace(/[;=].*/, "")

						// 判断是否为业务标识
						const isBusinessId = this.isBusinessIdentifier(name, className)
						if (isBusinessId.isBusiness) {
							identifiers.push({
								name,
								type,
								unique: isBusinessId.unique,
								description: isBusinessId.description,
							})
						}
					}
				})
			}

			// 如果没有找到明显的业务标识，添加默认的ID
			if (identifiers.length === 0) {
				identifiers.push({
					name: "id",
					type: "Long",
					unique: true,
					description: "主键标识",
				})
			}

			return identifiers
		} catch (error) {
			console.warn(`分析业务标识失败: ${error instanceof Error ? error.message : String(error)}`)
			return [
				{
					name: "id",
					type: "Long",
					unique: true,
					description: "主键标识",
				},
			]
		}
	}

	/**
	 * 根据聚合根生成业务相关的查询方法
	 */
	generateBusinessSpecificMethods(entityName: string, businessIdentifiers: BusinessIdentifier[]): RepositoryMethod[] {
		const methods: RepositoryMethod[] = []

		// 为每个业务标识生成查询方法
		businessIdentifiers.forEach((identifier) => {
			// findBy方法
			methods.push({
				name: `findBy${this.capitalize(identifier.name)}`,
				returnType: `Optional<${entityName}>`,
				parameters: [
					{
						name: identifier.name,
						type: identifier.type,
					},
				],
				description: `根据${identifier.description}查找${entityName}`,
				businessRelevant: true,
			})

			// 如果是唯一标识，生成deleteBy方法
			if (identifier.unique) {
				methods.push({
					name: `deleteBy${this.capitalize(identifier.name)}`,
					returnType: "void",
					parameters: [
						{
							name: identifier.name,
							type: identifier.type,
						},
					],
					description: `根据${identifier.description}删除${entityName}`,
					businessRelevant: true,
				})

				methods.push({
					name: `existsBy${this.capitalize(identifier.name)}`,
					returnType: "boolean",
					parameters: [
						{
							name: identifier.name,
							type: identifier.type,
						},
					],
					description: `检查指定${identifier.description}的${entityName}是否存在`,
					businessRelevant: true,
				})
			}
		})

		// 添加通用的save方法
		methods.push({
			name: "save",
			returnType: entityName,
			parameters: [
				{
					name: entityName.toLowerCase(),
					type: entityName,
				},
			],
			description: `保存${entityName}`,
			businessRelevant: true,
		})

		// 添加findAll方法（如果需要）
		methods.push({
			name: "findAll",
			returnType: `List<${entityName}>`,
			parameters: [],
			description: `查找所有${entityName}`,
			businessRelevant: false,
		})

		return methods
	}

	/**
	 * 避免通用方法，确保方法名具有业务含义
	 */
	avoidGenericMethods(methods: RepositoryMethod[]): RepositoryMethod[] {
		// 过滤掉通用的方法，保留业务相关的方法
		return methods.filter((method) => {
			// 避免通用的findById, deleteById等方法
			const genericPatterns = [/^findById$/, /^deleteById$/, /^existsById$/, /^findOne$/, /^delete$/]

			const isGeneric = genericPatterns.some((pattern) => pattern.test(method.name))
			return !isGeneric || method.businessRelevant
		})
	}

	/**
	 * 生成Repository接口代码
	 */
	generateRepositoryInterface(
		entityName: string,
		packageName: string,
		businessIdentifiers: BusinessIdentifier[],
	): RepositoryInterfaceDefinition {
		const interfaceName = `${entityName}Repository`
		const methods = this.generateBusinessSpecificMethods(entityName, businessIdentifiers)
		const filteredMethods = this.avoidGenericMethods(methods)

		// 确定需要的imports
		const imports = ["java.util.Optional", "java.util.List"]

		// 如果有业务标识类型需要import
		businessIdentifiers.forEach((identifier) => {
			if (identifier.type !== "String" && identifier.type !== "Long" && identifier.type !== "Integer") {
				imports.push(`${packageName}.domain.model.${identifier.type}`)
			}
		})

		return {
			interfaceName,
			entityName,
			packageName,
			businessIdentifiers,
			methods: filteredMethods,
			imports,
		}
	}

	/**
	 * 验证Repository接口一致性
	 */
	validateInterfaceConsistency(
		repositoryFilePath: string,
		entityFilePath: string,
	): {
		isConsistent: boolean
		issues: string[]
		suggestions: string[]
	} {
		const issues: string[] = []
		const suggestions: string[] = []

		try {
			// 读取Repository接口文件
			const repositoryContent = fs.readFileSync(repositoryFilePath, "utf-8")

			// 分析实体的业务标识
			const businessIdentifiers = this.analyzeBusinessIdentifiers(entityFilePath)

			// 检查Repository接口是否包含业务相关的方法
			businessIdentifiers.forEach((identifier) => {
				const expectedFindMethod = `findBy${this.capitalize(identifier.name)}`
				const findMethodPattern = new RegExp(`\\b${expectedFindMethod}\\b`)

				if (!findMethodPattern.test(repositoryContent)) {
					issues.push(`缺少业务查询方法: ${expectedFindMethod}`)
					suggestions.push(
						`添加方法: Optional<Entity> ${expectedFindMethod}(${identifier.type} ${identifier.name})`,
					)
				}

				// 检查唯一标识的删除和存在性检查方法
				if (identifier.unique) {
					const expectedDeleteMethod = `deleteBy${this.capitalize(identifier.name)}`
					const expectedExistsMethod = `existsBy${this.capitalize(identifier.name)}`

					if (!new RegExp(`\\b${expectedDeleteMethod}\\b`).test(repositoryContent)) {
						issues.push(`缺少业务删除方法: ${expectedDeleteMethod}`)
						suggestions.push(
							`添加方法: void ${expectedDeleteMethod}(${identifier.type} ${identifier.name})`,
						)
					}

					if (!new RegExp(`\\b${expectedExistsMethod}\\b`).test(repositoryContent)) {
						issues.push(`缺少存在性检查方法: ${expectedExistsMethod}`)
						suggestions.push(
							`添加方法: boolean ${expectedExistsMethod}(${identifier.type} ${identifier.name})`,
						)
					}
				}
			})

			// 检查是否包含通用方法（应该避免）
			const genericMethodPatterns = [
				{ pattern: /\bfindById\b/, message: "避免使用通用的findById方法，使用业务相关的查询方法" },
				{ pattern: /\bdeleteById\b/, message: "避免使用通用的deleteById方法，使用业务相关的删除方法" },
				{ pattern: /\bfindOne\b/, message: "避免使用通用的findOne方法，使用业务相关的查询方法" },
			]

			genericMethodPatterns.forEach(({ pattern, message }) => {
				if (pattern.test(repositoryContent)) {
					issues.push(message)
					suggestions.push("重构为业务相关的方法名")
				}
			})

			// 检查返回类型是否正确使用Optional
			const methodMatches = repositoryContent.match(/^\s*\w+\s+(\w+)\s*\([^)]*\)\s*;/gm)
			if (methodMatches) {
				methodMatches.forEach((match) => {
					if (match.includes("find") && !match.includes("Optional") && !match.includes("List")) {
						issues.push(`查询方法应该返回Optional类型: ${match.trim()}`)
						suggestions.push("将返回类型修改为Optional<Entity>")
					}
				})
			}
		} catch (error) {
			issues.push(`验证Repository接口时发生错误: ${error instanceof Error ? error.message : String(error)}`)
		}

		return {
			isConsistent: issues.length === 0,
			issues,
			suggestions,
		}
	}

	// 辅助方法
	private isBusinessIdentifier(
		fieldName: string,
		entityName: string,
	): {
		isBusiness: boolean
		unique: boolean
		description: string
	} {
		const businessPatterns = [
			{ pattern: /^id$/i, description: "主键标识", unique: true },
			{ pattern: /.*key$/i, description: "业务键", unique: true },
			{ pattern: /.*code$/i, description: "业务编码", unique: true },
			{ pattern: /.*number$/i, description: "业务编号", unique: true },
			{ pattern: /.*name$/i, description: "名称", unique: false },
			{ pattern: /.*email$/i, description: "邮箱", unique: true },
			{ pattern: /.*phone$/i, description: "电话", unique: false },
			{ pattern: /.*publickey$/i, description: "公钥", unique: true },
			{ pattern: /.*certificate$/i, description: "证书", unique: false },
		]

		for (const pattern of businessPatterns) {
			if (pattern.pattern.test(fieldName)) {
				return {
					isBusiness: true,
					unique: pattern.unique,
					description: pattern.description,
				}
			}
		}

		return {
			isBusiness: false,
			unique: false,
			description: "字段",
		}
	}

	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1)
	}
}
