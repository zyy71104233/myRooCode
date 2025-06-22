import { Task } from "../task/Task"
import { ToolUse, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"
import { formatResponse } from "../prompts/responses"

// Import DDD tool functions
import { executeDddInitLayer } from "./ddd/ddd-init-layer"
import { executeDddVerifyLayer } from "./ddd/ddd-verify-layer"
import { executeDddLayerComplete } from "./ddd/ddd-layer-complete"
import { executeDddAwaitConfirmation } from "./ddd/ddd-await-confirmation"
import { executeVerifyCompilation } from "./verification/verify-compilation"
import { executeDddValidateBestPractices } from "./ddd/ddd-validate-best-practices"
import { executeDddWorkflowStatus } from "./ddd/ddd-workflow-status"

// Import DDD workflow manager
import { DddWorkflowManager, DddLayer } from "./ddd/DddWorkflowManager"

/**
 * Main DDD tool executor that handles all DDD-related tools
 */
export async function executeDddTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	try {
		if (block.partial) {
			// Handle partial execution for streaming
			await cline.ask("tool", JSON.stringify({ tool: block.name }), block.partial).catch(() => {})
			return
		}

		// Reset mistake count for successful validation
		cline.consecutiveMistakeCount = 0

		// Initialize DDD workflow manager
		const workflowManager = new DddWorkflowManager(cline.cwd)

		// Create a generic update callback for tool results
		const updateCallback = (toolName: string, content: string) => {
			pushToolResult(content)
		}

		const askCallback = async (type: any, message?: string) => {
			return await askApproval(type, message)
		}

		// Route to the appropriate DDD tool
		switch (block.name) {
			case "ddd_init_layer":
				const initLayer = workflowManager.validateLayer((block.params as any).layer || "")
				workflowManager.setCurrentLayer(initLayer)
				await executeDddInitLayer(
					{
						layer: initLayer,
						description: (block.params as any).description || "",
						requirements: (block.params as any).requirements || [],
					},
					cline.cwd,
					askCallback,
					updateCallback,
				)
				break

			case "ddd_verify_layer":
				const verifyLayer = workflowManager.validateLayer((block.params as any).layer || "")
				await executeDddVerifyLayer(
					{
						layer: verifyLayer,
						testCommand: (block.params as any).testCommand || "",
						validationChecks: ((block.params as any).validationChecks || "")
							.split(",")
							.filter((v: string) => v.trim()),
					},
					cline.cwd,
					askCallback,
					updateCallback,
				)
				break

			case "ddd_layer_complete":
				const completeLayer = workflowManager.validateLayer((block.params as any).layer || "")
				workflowManager.markLayerComplete(completeLayer)

				// 添加工作流状态报告
				const statusReport = workflowManager.getCompletionReport()
				updateCallback("ddd_workflow_status", statusReport)

				await executeDddLayerComplete(
					{
						layer: completeLayer,
						summary: (block.params as any).summary || "",
						filesCreated: ((block.params as any).filesCreated || "")
							.split(",")
							.filter((f: string) => f.trim()),
						testsCreated: ((block.params as any).testsCreated || "")
							.split(",")
							.filter((t: string) => t.trim()),
						nextLayer: workflowManager.getNextLayer(completeLayer) || "",
					},
					cline.cwd,
					askCallback,
					updateCallback,
				)
				break

			case "ddd_await_confirmation":
				const confirmLayer = workflowManager.validateLayer((block.params as any).layer || "")
				await executeDddAwaitConfirmation(
					{
						layer: confirmLayer,
						completedWork: (block.params as any).completedWork || "",
						testResults: (block.params as any).testResults || "",
						nextLayer: workflowManager.getNextLayer(confirmLayer) || "",
					},
					cline.cwd,
					askCallback,
					updateCallback,
				)
				break

			case "verify_compilation":
				await executeVerifyCompilation(
					{
						buildCommand: (block.params as any).buildCommand || "",
						timeout: (block.params as any).timeout
							? parseInt((block.params as any).timeout as string)
							: undefined,
					},
					cline.cwd,
					askCallback,
					updateCallback,
				)
				break

			// Placeholder implementations for other tools
			case "ddd_run_layer_tests":
				pushToolResult(formatResponse.toolResult("DDD layer tests functionality not yet implemented."))
				break

			case "ddd_generate_layer_docs":
				pushToolResult(formatResponse.toolResult("DDD layer documentation generation not yet implemented."))
				break

			case "verify_database_connection":
				pushToolResult(formatResponse.toolResult("Database connection verification not yet implemented."))
				break

			case "run_unit_tests":
				pushToolResult(formatResponse.toolResult("Unit tests execution not yet implemented."))
				break

			case "run_integration_tests":
				pushToolResult(formatResponse.toolResult("Integration tests execution not yet implemented."))
				break

			case "validate_layer_architecture":
				pushToolResult(formatResponse.toolResult("Layer architecture validation not yet implemented."))
				break

			case "ddd_validate_best_practices":
				await executeDddValidateBestPractices(
					{
						projectPath: (block.params as any).projectPath || cline.cwd,
						checkTypes: ((block.params as any).checkTypes || "maven,database,repository,tests")
							.split(",")
							.filter((t: string) => t.trim()),
						autoFix: (block.params as any).autoFix === "true" || (block.params as any).autoFix === true,
					},
					cline.cwd,
					askCallback,
					updateCallback,
				)
				break

			case "ddd_workflow_status":
				await executeDddWorkflowStatus({}, cline.cwd, askCallback, updateCallback)
				break

			default:
				cline.consecutiveMistakeCount++
				cline.recordToolError(block.name)
				pushToolResult(formatResponse.toolError(`Unknown DDD tool: ${block.name}`))
				break
		}
	} catch (error) {
		await handleError(`executing DDD tool ${block.name}`, error)
	}
}

/**
 * Check if a tool name is a DDD tool
 */
export function isDddTool(toolName: string): boolean {
	const dddTools = [
		"ddd_init_layer",
		"ddd_verify_layer",
		"ddd_layer_complete",
		"ddd_await_confirmation",
		"ddd_run_layer_tests",
		"ddd_generate_layer_docs",
		"verify_compilation",
		"verify_database_connection",
		"run_unit_tests",
		"run_integration_tests",
		"validate_layer_architecture",
		"ddd_validate_best_practices",
		"ddd_workflow_status",
	]
	return dddTools.includes(toolName)
}
