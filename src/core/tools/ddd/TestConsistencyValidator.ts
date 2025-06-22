import * as fs from "fs"
import * as path from "path"

export interface ConstructorParameter {
	name: string
	type: string
	required: boolean
}

export interface ModelAnalysis {
	className: string
	isValueObject: boolean
	isEntity: boolean
	constructorParameters: ConstructorParameter[]
	hasIdMethod: boolean
	hasValueMethod: boolean
	methods: string[]
}

export interface TestValidationResult {
	consistent: boolean
	issues: string[]
	recommendations: string[]
	modelAnalysis: ModelAnalysis
	testAnalysis: {
		hasMatchingConstructorCalls: boolean
		usesCorrectAccessMethods: boolean
		optionalApiConsistency: boolean
	}
}

/**
 * 测试一致性验证器 - 解决模型与测试类不匹配问题
 * 基于certificate_issues_combined.md中的问题2.1
 */
export class TestConsistencyValidator {
	/**
	 * 验证构造器参数一致性
	 */
	validateConstructorParameters(
		modelFilePath: string,
		testFilePath: string,
	): {
		consistent: boolean
		issues: string[]
		modelParams: ConstructorParameter[]
		testCalls: string[]
	} {
		const issues: string[] = []

		try {
			const modelContent = fs.readFileSync(modelFilePath, "utf-8")
			const testContent = fs.readFileSync(testFilePath, "utf-8")

			const modelParams = this.extractConstructorParameters(modelContent)
			const testCalls = this.extractConstructorCalls(testContent)

			// 检查测试中的构造器调用是否与模型匹配
			for (const testCall of testCalls) {
				const testParamCount = this.countParameters(testCall)
				const modelParamCount = modelParams.length

				if (testParamCount !== modelParamCount) {
					issues.push(
						`构造器参数数量不匹配: 模型需要${modelParamCount}个参数，测试提供了${testParamCount}个参数`,
					)
				}
			}

			return {
				consistent: issues.length === 0,
				issues,
				modelParams,
				testCalls,
			}
		} catch (error) {
			issues.push(`验证构造器参数时出错: ${error instanceof Error ? error.message : String(error)}`)
			return {
				consistent: false,
				issues,
				modelParams: [],
				testCalls: [],
			}
		}
	}

	/**
	 * 分析模型类型（值对象或实体）
	 */
	analyzeModelType(modelFilePath: string): ModelAnalysis {
		const modelContent = fs.readFileSync(modelFilePath, "utf-8")
		const className = this.extractClassName(modelContent)

		// 检查是否为值对象（通常没有ID字段，有value()方法）
		const hasIdField = /private.*\s+id\s*[;=]/.test(modelContent)
		const hasIdMethod = /public.*getId\s*\(\s*\)/.test(modelContent)
		const hasValueMethod = /public.*value\s*\(\s*\)/.test(modelContent)

		// 检查是否实现了特定接口或继承特定类
		const implementsValueObject = /implements.*ValueObject/.test(modelContent)
		const extendsEntity = /extends.*Entity/.test(modelContent)

		const isValueObject = !hasIdField && (hasValueMethod || implementsValueObject)
		const isEntity = hasIdField || hasIdMethod || extendsEntity

		return {
			className,
			isValueObject,
			isEntity,
			constructorParameters: this.extractConstructorParameters(modelContent),
			hasIdMethod,
			hasValueMethod,
			methods: this.extractMethods(modelContent),
		}
	}

	/**
	 * 为值对象生成测试模板
	 */
	generateValueObjectTest(modelAnalysis: ModelAnalysis): string {
		const { className, constructorParameters } = modelAnalysis

		const testParams = constructorParameters
			.map((param) => {
				switch (param.type.toLowerCase()) {
					case "string":
						return `"test${param.name}"`
					case "int":
					case "integer":
						return "1"
					case "boolean":
						return "true"
					case "long":
						return "1L"
					case "double":
						return "1.0"
					default:
						return `new ${param.type}()`
				}
			})
			.join(", ")

		return `@Test
public void should${className}BeCreated() {
    // Given
    ${constructorParameters
		.map((param) => `${param.type} ${param.name} = ${this.getDefaultValue(param.type)};`)
		.join("\n    ")}
    
    // When
    ${className} ${className.toLowerCase()} = new ${className}(${constructorParameters.map((p) => p.name).join(", ")});
    
    // Then
    assertThat(${className.toLowerCase()}).isNotNull();
    ${
		modelAnalysis.hasValueMethod
			? `assertThat(${className.toLowerCase()}.value()).isEqualTo(${constructorParameters[0]?.name || "expectedValue"});`
			: `// 值对象验证逻辑`
	}
}

@Test
public void should${className}BeEqual() {
    // Given
    ${constructorParameters
		.map((param) => `${param.type} ${param.name} = ${this.getDefaultValue(param.type)};`)
		.join("\n    ")}
    
    // When
    ${className} ${className.toLowerCase()}1 = new ${className}(${constructorParameters.map((p) => p.name).join(", ")});
    ${className} ${className.toLowerCase()}2 = new ${className}(${constructorParameters.map((p) => p.name).join(", ")});
    
    // Then
    assertThat(${className.toLowerCase()}1).isEqualTo(${className.toLowerCase()}2);
    assertThat(${className.toLowerCase()}1.hashCode()).isEqualTo(${className.toLowerCase()}2.hashCode());
}`
	}

	/**
	 * 为实体生成测试模板
	 */
	generateEntityTest(modelAnalysis: ModelAnalysis): string {
		const { className, constructorParameters } = modelAnalysis

		return `@Test
public void should${className}BeCreated() {
    // Given
    ${constructorParameters
		.map((param) => `${param.type} ${param.name} = ${this.getDefaultValue(param.type)};`)
		.join("\n    ")}
    
    // When
    ${className} ${className.toLowerCase()} = new ${className}(${constructorParameters.map((p) => p.name).join(", ")});
    
    // Then
    assertThat(${className.toLowerCase()}).isNotNull();
    ${modelAnalysis.hasIdMethod ? `assertThat(${className.toLowerCase()}.getId()).isNotNull();` : `// 实体验证逻辑`}
}

@Test
public void should${className}HaveIdentity() {
    // Given
    ${constructorParameters
		.map((param) => `${param.type} ${param.name} = ${this.getDefaultValue(param.type)};`)
		.join("\n    ")}
    
    // When
    ${className} ${className.toLowerCase()} = new ${className}(${constructorParameters.map((p) => p.name).join(", ")});
    
    // Then
    ${modelAnalysis.hasIdMethod ? `assertThat(${className.toLowerCase()}.getId()).isNotNull();` : `// 验证实体标识`}
}`
	}

	/**
	 * 验证Optional API使用一致性
	 */
	validateOptionalApiUsage(testFilePath: string): {
		consistent: boolean
		issues: string[]
		recommendations: string[]
	} {
		const issues: string[] = []
		const recommendations: string[] = []

		try {
			const testContent = fs.readFileSync(testFilePath, "utf-8")

			// 检查Optional的使用模式
			const usesPresentMethod = /\.isPresent\(\s*\)/.test(testContent)
			const usesEmptyMethod = /\.isEmpty\(\s*\)/.test(testContent)

			if (usesPresentMethod && usesEmptyMethod) {
				issues.push("测试中同时使用了isPresent()和isEmpty()方法，建议统一使用")
				recommendations.push("统一使用isPresent()方法，因为它在所有Java版本中都可用")
			}

			// 检查过时的Optional使用方式
			const usesGetWithoutCheck = /Optional.*\.get\(\s*\)/.test(testContent)
			if (usesGetWithoutCheck) {
				issues.push("直接使用Optional.get()可能导致异常")
				recommendations.push("使用orElse()、orElseThrow()或先检查isPresent()")
			}

			return {
				consistent: issues.length === 0,
				issues,
				recommendations,
			}
		} catch (error) {
			issues.push(`验证Optional API使用时出错: ${error instanceof Error ? error.message : String(error)}`)
			return {
				consistent: false,
				issues,
				recommendations: ["检查文件是否存在且可读"],
			}
		}
	}

	/**
	 * 综合验证测试与模型的对齐情况
	 */
	validateTestModelAlignment(modelFilePath: string, testFilePath: string): TestValidationResult {
		const modelAnalysis = this.analyzeModelType(modelFilePath)
		const constructorValidation = this.validateConstructorParameters(modelFilePath, testFilePath)
		const optionalValidation = this.validateOptionalApiUsage(testFilePath)

		const issues: string[] = []
		const recommendations: string[] = []

		// 合并所有问题
		issues.push(...constructorValidation.issues)
		issues.push(...optionalValidation.issues)

		// 合并所有建议
		recommendations.push(...optionalValidation.recommendations)

		// 检查访问方法使用是否正确
		const testContent = fs.readFileSync(testFilePath, "utf-8")
		let usesCorrectAccessMethods = true

		if (modelAnalysis.isValueObject && testContent.includes(".getId()")) {
			issues.push("值对象测试中使用了getId()方法，但值对象通常没有ID")
			recommendations.push("值对象应该使用value()方法或直接比较")
			usesCorrectAccessMethods = false
		}

		if (modelAnalysis.isEntity && !modelAnalysis.hasIdMethod && testContent.includes(".getId()")) {
			issues.push("实体测试中使用了getId()方法，但该实体没有getId()方法")
			recommendations.push("检查实体是否正确实现了ID访问方法")
			usesCorrectAccessMethods = false
		}

		return {
			consistent: issues.length === 0,
			issues,
			recommendations,
			modelAnalysis,
			testAnalysis: {
				hasMatchingConstructorCalls: constructorValidation.consistent,
				usesCorrectAccessMethods,
				optionalApiConsistency: optionalValidation.consistent,
			},
		}
	}

	// 辅助方法
	private extractClassName(content: string): string {
		const match = content.match(/class\s+(\w+)/)
		return match ? match[1] : "UnknownClass"
	}

	private extractConstructorParameters(content: string): ConstructorParameter[] {
		const constructorMatch = content.match(/public\s+\w+\s*\(([^)]*)\)/)
		if (!constructorMatch) return []

		const paramString = constructorMatch[1].trim()
		if (!paramString) return []

		return paramString.split(",").map((param) => {
			const parts = param.trim().split(/\s+/)
			const type = parts[0]
			const name = parts[1]
			return {
				name: name || "param",
				type: type || "Object",
				required: true,
			}
		})
	}

	private extractConstructorCalls(content: string): string[] {
		const regex = /new\s+\w+\s*\([^)]*\)/g
		return content.match(regex) || []
	}

	private extractMethods(content: string): string[] {
		const regex = /public\s+\w+\s+(\w+)\s*\([^)]*\)/g
		const methods: string[] = []
		let match
		while ((match = regex.exec(content)) !== null) {
			methods.push(match[1])
		}
		return methods
	}

	private countParameters(constructorCall: string): number {
		const match = constructorCall.match(/\(([^)]*)\)/)
		if (!match || !match[1].trim()) return 0

		return match[1].split(",").length
	}

	private getDefaultValue(type: string): string {
		switch (type.toLowerCase()) {
			case "string":
				return '"testValue"'
			case "int":
			case "integer":
				return "1"
			case "boolean":
				return "true"
			case "long":
				return "1L"
			case "double":
				return "1.0"
			case "float":
				return "1.0f"
			default:
				return `mock(${type}.class)`
		}
	}
}
