import { Anthropic } from "@anthropic-ai/sdk"
import { ClineAsk, ToolName } from "@roo-code/types"

export interface DddAwaitConfirmationParams {
	layer: "config" | "domain" | "infrastructure" | "application" | "interface"
	completedWork: string
	testResults?: string
	nextLayer?: string
}

export type DddConfirmationResult = {
	layer: string
	approved: boolean
	message: string
	feedback?: string
}

export async function executeDddAwaitConfirmation(
	params: DddAwaitConfirmationParams,
	cwd: string,
	askCallback: (type: ClineAsk, message?: string) => Promise<boolean>,
	updateCallback: (type: ToolName, content: string) => void,
): Promise<string> {
	try {
		const { layer, completedWork, testResults, nextLayer } = params

		// Validate layer type
		const validLayers = ["config", "domain", "infrastructure", "application", "interface"]
		if (!validLayers.includes(layer)) {
			throw new Error(`Invalid layer: ${layer}. Must be one of: ${validLayers.join(", ")}`)
		}

		// Format confirmation request
		let confirmationMessage = `🔍 ${layer.toUpperCase()} Layer Completion Review\n\n`
		confirmationMessage += `📝 Completed Work:\n${completedWork}\n\n`

		if (testResults) {
			confirmationMessage += `🧪 Test Results:\n${testResults}\n\n`
		}

		if (nextLayer) {
			confirmationMessage += `⏭️ Next Layer: ${nextLayer}\n\n`
		}

		confirmationMessage += `❓ Do you approve this layer implementation and want to proceed?`

		// Ask for human confirmation
		const approved = await askCallback("ddd_layer_approval", confirmationMessage)

		const result: DddConfirmationResult = {
			layer,
			approved,
			message: approved
				? `✅ ${layer} layer approved! Ready to proceed to ${nextLayer || "next phase"}.`
				: `❌ ${layer} layer requires revision. Please review and make necessary changes.`,
		}

		const responseText = formatConfirmationReport(result)
		updateCallback("ddd_await_confirmation", responseText)
		return responseText
	} catch (error) {
		const errorMessage = `Error awaiting DDD confirmation: ${error instanceof Error ? error.message : String(error)}`
		updateCallback("ddd_await_confirmation", errorMessage)
		return errorMessage
	}
}

function formatConfirmationReport(result: DddConfirmationResult): string {
	let report = `🔍 ${result.layer.toUpperCase()} Layer Confirmation Result\n\n`

	report += `✅ Status: ${result.approved ? "APPROVED" : "REQUIRES REVISION"}\n`
	report += `📝 Message: ${result.message}\n\n`

	if (result.feedback) {
		report += `💬 Feedback: ${result.feedback}\n\n`
	}

	if (result.approved) {
		report += `🚀 Ready to proceed to the next phase of development.`
	} else {
		report += `⚠️ Please address the feedback and retry layer verification.`
	}

	return report
}

export function getDddAwaitConfirmationDescription(): string {
	return `Wait for human confirmation before proceeding to the next DDD layer. This tool ensures human oversight and approval at each layer boundary.

Parameters:
- layer (required): The layer that has been completed. Must be one of:
  - "config": Project configuration and dependencies
  - "domain": Core business logic and domain model
  - "infrastructure": Data persistence and external services
  - "application": Use cases and application services
  - "interface": APIs and user interfaces
- completedWork (required): A summary of the work completed in this layer
- testResults (optional): Results from running tests for this layer
- nextLayer (optional): The next layer to be implemented

This tool:
1. Presents a comprehensive review of the completed layer
2. Requests explicit human approval before proceeding
3. Provides clear feedback on approval status
4. Ensures quality gates are maintained throughout development

Use this tool after completing a layer and before moving to the next one.`
}
