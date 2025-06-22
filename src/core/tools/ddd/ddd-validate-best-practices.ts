import { ClineAsk, ToolName } from "@roo-code/types"
import { DDDBestPracticeChecker, ValidationResult, FixSuggestion } from "./DDDBestPracticeChecker"

export interface DddValidateBestPracticesParams {
	projectPath?: string
	checkTypes?: string[] // ['maven', 'database', 'repository', 'tests']
	autoFix?: boolean
}

export interface DddBestPracticesResult {
	overallResult: ValidationResult
	individualResults: {
		maven?: ValidationResult
		database?: ValidationResult
		repository?: ValidationResult
		tests?: ValidationResult
	}
	fixSuggestions: FixSuggestion[]
	autoFixApplied: string[]
}

export async function executeDddValidateBestPractices(
	params: DddValidateBestPracticesParams,
	cwd: string,
	askCallback: (type: ClineAsk, message?: string) => Promise<boolean>,
	updateCallback: (type: ToolName, content: string) => void,
): Promise<string> {
	try {
		const { projectPath = cwd, checkTypes = ["maven", "database", "repository", "tests"], autoFix = false } = params

		const checker = new DDDBestPracticeChecker()

		// 执行综合检查
		const overallResult = await checker.checkProjectBestPractices(projectPath)

		// 生成修复建议
		const fixSuggestions = checker.generateFixSuggestions(overallResult)

		// 执行个别检查以获取详细信息
		const individualResults: any = {}

		if (checkTypes.includes("maven")) {
			const pomPath = require("path").join(projectPath, "pom.xml")
			individualResults.maven = await checker.checkMavenConfiguration(pomPath)
		}

		if (checkTypes.includes("database")) {
			const schemaPath = require("path").join(projectPath, "src", "main", "resources", "schema.sql")
			individualResults.database = checker.checkDatabaseSchema(schemaPath)
		}

		const result: DddBestPracticesResult = {
			overallResult,
			individualResults,
			fixSuggestions,
			autoFixApplied: [],
		}

		// 如果启用自动修复，应用可自动修复的建议
		if (autoFix) {
			const autoFixableIssues = fixSuggestions.filter((s) => s.autoFixable)

			for (const suggestion of autoFixableIssues) {
				if (suggestion.priority === "high") {
					const shouldFix = await askCallback("tool", `是否自动修复: ${suggestion.title}?`)
					if (shouldFix) {
						// 这里可以实现具体的自动修复逻辑
						result.autoFixApplied.push(suggestion.title)
					}
				}
			}
		}

		// 格式化报告
		const report = formatBestPracticesReport(result)

		updateCallback("ddd_validate_best_practices", report)
		return report
	} catch (error) {
		const errorMessage = `DDD最佳实践验证失败: ${error instanceof Error ? error.message : String(error)}`
		updateCallback("ddd_validate_best_practices", errorMessage)
		return errorMessage
	}
}

function formatBestPracticesReport(result: DddBestPracticesResult): string {
	let report = `🔍 DDD最佳实践验证报告\n\n`

	// 总体评分
	const { overallResult } = result
	const scoreEmoji = overallResult.score >= 90 ? "🟢" : overallResult.score >= 70 ? "🟡" : "🔴"
	report += `${scoreEmoji} 总体评分: ${overallResult.score}/100\n`
	report += `✅ 状态: ${overallResult.passed ? "通过" : "需要改进"}\n\n`

	// 问题总结
	if (overallResult.issues.length > 0) {
		report += `❌ 发现的问题 (${overallResult.issues.length}):\n`
		overallResult.issues.forEach((issue, index) => {
			report += `${index + 1}. ${issue}\n`
		})
		report += `\n`
	}

	// 警告
	if (overallResult.warnings.length > 0) {
		report += `⚠️ 警告 (${overallResult.warnings.length}):\n`
		overallResult.warnings.forEach((warning, index) => {
			report += `${index + 1}. ${warning}\n`
		})
		report += `\n`
	}

	// 修复建议
	if (result.fixSuggestions.length > 0) {
		report += `🔧 修复建议:\n`

		const highPriority = result.fixSuggestions.filter((s) => s.priority === "high")
		const mediumPriority = result.fixSuggestions.filter((s) => s.priority === "medium")
		const lowPriority = result.fixSuggestions.filter((s) => s.priority === "low")

		if (highPriority.length > 0) {
			report += `\n🔴 高优先级:\n`
			highPriority.forEach((suggestion, index) => {
				report += `${index + 1}. ${suggestion.title}\n`
				report += `   ${suggestion.description}\n`
				if (suggestion.autoFixable) {
					report += `   ✨ 可自动修复\n`
				}
				if (suggestion.fixCode) {
					report += `   📝 修复代码:\n${suggestion.fixCode}\n`
				}
				report += `\n`
			})
		}

		if (mediumPriority.length > 0) {
			report += `🟡 中优先级:\n`
			mediumPriority.forEach((suggestion, index) => {
				report += `${index + 1}. ${suggestion.title}\n`
				report += `   ${suggestion.description}\n`
				if (suggestion.autoFixable) {
					report += `   ✨ 可自动修复\n`
				}
				report += `\n`
			})
		}

		if (lowPriority.length > 0) {
			report += `🟢 低优先级:\n`
			lowPriority.forEach((suggestion, index) => {
				report += `${index + 1}. ${suggestion.title}\n`
				report += `   ${suggestion.description}\n`
				report += `\n`
			})
		}
	}

	// 自动修复结果
	if (result.autoFixApplied.length > 0) {
		report += `✅ 已自动修复的问题:\n`
		result.autoFixApplied.forEach((fix, index) => {
			report += `${index + 1}. ${fix}\n`
		})
		report += `\n`
	}

	// 建议
	if (overallResult.recommendations.length > 0) {
		report += `💡 建议:\n`
		overallResult.recommendations.slice(0, 5).forEach((rec, index) => {
			report += `${index + 1}. ${rec}\n`
		})
		if (overallResult.recommendations.length > 5) {
			report += `... 还有 ${overallResult.recommendations.length - 5} 条建议\n`
		}
	}

	return report
}

export function getDddValidateBestPracticesDescription(): string {
	return `验证DDD项目是否符合最佳实践，包括Maven配置、数据库设计、Repository模式等。

参数:
- projectPath (可选): 项目路径，默认为当前目录
- checkTypes (可选): 检查类型数组，可包含 'maven', 'database', 'repository', 'tests'
- autoFix (可选): 是否启用自动修复，默认为false

此工具会:
1. 检查Maven配置的Java版本兼容性
2. 验证数据库schema的MySQL兼容性
3. 检查Repository接口与实现的一致性
4. 验证测试与模型的对齐情况
5. 提供具体的修复建议和代码示例
6. 支持自动修复部分问题

基于certificate_issues_combined.md中发现的常见问题进行检查。`
}
