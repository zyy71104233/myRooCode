import { Anthropic } from "@anthropic-ai/sdk"
import { ClineAsk, ToolName } from "@roo-code/types"

export interface DddLayerCompleteParams {
	layer: "config" | "domain" | "infrastructure" | "application" | "interface"
	summary: string
	filesCreated?: string[]
	testsCreated?: string[]
	nextLayer?: string
}

export type DddLayerCompleteResult = {
	layer: string
	completed: boolean
	summary: string
	nextLayer?: string
	message: string
}

export async function executeDddLayerComplete(
	params: DddLayerCompleteParams,
	cwd: string,
	askCallback: (type: ClineAsk, message?: string) => Promise<boolean>,
	updateCallback: (type: ToolName, content: string) => void,
): Promise<string> {
	try {
		const { layer, summary, filesCreated, testsCreated, nextLayer } = params

		// Validate layer type
		const validLayers = ["config", "domain", "infrastructure", "application", "interface"]
		if (!validLayers.includes(layer)) {
			throw new Error(`Invalid layer: ${layer}. Must be one of: ${validLayers.join(", ")}`)
		}

		// Create completion result
		const result: DddLayerCompleteResult = {
			layer,
			completed: true,
			summary,
			nextLayer,
			message: `${layer} layer has been completed successfully.`,
		}

		// Get next layer if not specified
		if (!nextLayer) {
			const layerOrder = ["config", "domain", "infrastructure", "application", "interface"]
			const currentIndex = layerOrder.indexOf(layer)
			if (currentIndex >= 0 && currentIndex < layerOrder.length - 1) {
				result.nextLayer = layerOrder[currentIndex + 1]
			}
		}

		// Format completion report
		let report = formatLayerCompletionReport(result, filesCreated, testsCreated)

		updateCallback("ddd_layer_complete", report)
		return report
	} catch (error) {
		const errorMessage = `Error completing DDD layer: ${error instanceof Error ? error.message : String(error)}`
		updateCallback("ddd_layer_complete", errorMessage)
		return errorMessage
	}
}

function formatLayerCompletionReport(
	result: DddLayerCompleteResult,
	filesCreated?: string[],
	testsCreated?: string[],
): string {
	let report = `🎉 ${result.layer.toUpperCase()} Layer Completion Report\n\n`

	report += `✅ Status: COMPLETED\n`
	report += `📝 Summary: ${result.summary}\n\n`

	if (filesCreated && filesCreated.length > 0) {
		report += `📄 Files Created:\n${filesCreated.map((file) => `  • ${file}`).join("\n")}\n\n`
	}

	if (testsCreated && testsCreated.length > 0) {
		report += `🧪 Tests Created:\n${testsCreated.map((test) => `  • ${test}`).join("\n")}\n\n`
	}

	if (result.nextLayer) {
		report += `⏭️ Next Layer: ${result.nextLayer}\n\n`
		report += `📋 Next Steps:\n`
		report += `1. Run ddd_verify_layer to validate this layer\n`
		report += `2. Use ddd_await_confirmation to get human approval\n`
		report += `3. Initialize ${result.nextLayer} layer with ddd_init_layer\n\n`
	} else {
		report += `🏁 Final Layer: All DDD layers have been completed!\n\n`
		report += `📋 Final Steps:\n`
		report += `1. Run comprehensive integration tests\n`
		report += `2. Perform final verification\n`
		report += `3. Generate complete documentation\n\n`
	}

	report += `⚠️ Important: This layer is now ready for verification and human approval before proceeding.`

	return report
}

export function getDddLayerCompleteDescription(): string {
	return `Mark a DDD layer as complete and prepare for the next layer. This tool signifies that all work for the current layer has been finished and provides a comprehensive completion report.

Parameters:
- layer (required): The layer that has been completed. Must be one of:
  - "config": Project configuration and dependencies
  - "domain": Core business logic and domain model  
  - "infrastructure": Data persistence and external services
  - "application": Use cases and application services
  - "interface": APIs and user interfaces
- summary (required): A brief summary of what was accomplished in this layer
- filesCreated (optional): Array of files that were created during this layer's implementation
- testsCreated (optional): Array of test files that were created for this layer
- nextLayer (optional): The next layer to be implemented (auto-determined if not specified)

This tool:
1. Validates the completed layer
2. Creates a comprehensive completion report
3. Identifies the next layer in the DDD sequence
4. Provides clear next steps for verification and approval
5. Prepares the workflow for human confirmation

Use this tool when you have finished implementing all components of a layer and are ready to move to the verification and approval phase.`
}
