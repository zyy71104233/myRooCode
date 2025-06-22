import { Anthropic } from "@anthropic-ai/sdk"
import { ClineAsk, ToolName } from "@roo-code/types"

export interface DddInitLayerParams {
	layer: "config" | "domain" | "infrastructure" | "application" | "interface"
	description?: string
	requirements?: string
}

export type DddInitLayerResult = {
	layer: string
	status: "initialized" | "already_active" | "error"
	message: string
	nextSteps?: string[]
}

export async function executeDddInitLayer(
	params: DddInitLayerParams,
	cwd: string,
	askCallback: (type: ClineAsk, message?: string) => Promise<boolean>,
	updateCallback: (type: ToolName, content: string) => void,
): Promise<string> {
	try {
		const { layer, description, requirements } = params

		// Validate layer type
		const validLayers = ["config", "domain", "infrastructure", "application", "interface"]
		if (!validLayers.includes(layer)) {
			throw new Error(`Invalid layer: ${layer}. Must be one of: ${validLayers.join(", ")}`)
		}

		// Initialize layer tracking
		const result: DddInitLayerResult = {
			layer,
			status: "initialized",
			message: `Initializing ${layer} layer development`,
			nextSteps: [],
		}

		// Define layer-specific next steps
		switch (layer) {
			case "config":
				result.nextSteps = [
					"Create project configuration files (pom.xml/build.gradle)",
					"Set up database schema files",
					"Configure dependencies and build tools",
					"Verify compilation and database connectivity",
				]
				break
			case "domain":
				result.nextSteps = [
					"Create domain entities and value objects",
					"Implement domain services and aggregates",
					"Define repository interfaces",
					"Create comprehensive unit tests for domain logic",
				]
				break
			case "infrastructure":
				result.nextSteps = [
					"Implement repository interfaces",
					"Create data access layers",
					"Set up database connections and migrations",
					"Create integration tests for infrastructure",
				]
				break
			case "application":
				result.nextSteps = [
					"Create application services and use cases",
					"Implement application-level validation",
					"Set up application layer coordination",
					"Create application layer tests",
				]
				break
			case "interface":
				result.nextSteps = [
					"Implement REST controllers or GraphQL resolvers",
					"Create API documentation",
					"Set up request/response handling",
					"Create integration tests for endpoints",
				]
				break
		}

		// Add description and requirements to message if provided
		if (description) {
			result.message += `\nDescription: ${description}`
		}
		if (requirements) {
			result.message += `\nRequirements: ${requirements}`
		}

		// Format the response
		const responseText = `Layer ${layer} initialized successfully.\n\nNext steps:\n${result.nextSteps.map((step) => `- ${step}`).join("\n")}\n\nRemember to:\n- Follow DDD principles and patterns\n- Create comprehensive tests for this layer\n- Ensure proper separation of concerns\n- Verify implementation before proceeding to next layer`

		updateCallback("ddd_init_layer", responseText)
		return responseText
	} catch (error) {
		const errorMessage = `Error initializing DDD layer: ${error instanceof Error ? error.message : String(error)}`
		updateCallback("ddd_init_layer", errorMessage)
		return errorMessage
	}
}

export function getDddInitLayerDescription(): string {
	return `Initialize a new DDD layer for development. This tool sets up the workspace and context for implementing a specific layer of Domain-Driven Design architecture.

Parameters:
- layer (required): The layer to initialize. Must be one of:
  - "config": Project configuration and dependencies setup
  - "domain": Core business logic and domain model
  - "infrastructure": Data persistence and external services
  - "application": Use cases and application services
  - "interface": APIs and user interfaces
- description (optional): Description of what will be implemented in this layer
- requirements (optional): Specific requirements for this layer

This tool:
1. Validates the layer type
2. Sets up the development context
3. Provides guidance on layer-specific implementation
4. Prepares for the structured DDD development workflow

Use this tool to begin work on a new layer in the DDD architecture.`
}
