import { Task } from "../task/Task"
import { ToolUse, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"
import { formatResponse } from "../prompts/responses"

// Import DDD tool functions
import { executeDddInitLayer } from "./ddd/ddd-init-layer"
import { executeDddVerifyLayer } from "./ddd/ddd-verify-layer"
import { executeDddLayerComplete } from "./ddd/ddd-layer-complete"
import { executeDddAwaitConfirmation } from "./ddd/ddd-await-confirmation"
import { executeVerifyCompilation } from "./verification/verify-compilation"

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
				await executeDddInitLayer(
					{
						layer: ((block.params as any).layer || "") as any,
						description: (block.params as any).description || "",
						requirements: (block.params as any).requirements || [],
					},
					cline.cwd,
					askCallback,
					updateCallback,
				)
				break

			case "ddd_verify_layer":
				await executeDddVerifyLayer(
					{
						layer: ((block.params as any).layer || "") as any,
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
				await executeDddLayerComplete(
					{
						layer: ((block.params as any).layer || "") as any,
						summary: (block.params as any).summary || "",
						filesCreated: ((block.params as any).filesCreated || "")
							.split(",")
							.filter((f: string) => f.trim()),
						testsCreated: ((block.params as any).testsCreated || "")
							.split(",")
							.filter((t: string) => t.trim()),
						nextLayer: (block.params as any).nextLayer || "",
					},
					cline.cwd,
					askCallback,
					updateCallback,
				)
				break

			case "ddd_await_confirmation":
				await executeDddAwaitConfirmation(
					{
						layer: ((block.params as any).layer || "") as any,
						completedWork: (block.params as any).completedWork || "",
						testResults: (block.params as any).testResults || "",
						nextLayer: (block.params as any).nextLayer || "",
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
	]
	return dddTools.includes(toolName)
}
