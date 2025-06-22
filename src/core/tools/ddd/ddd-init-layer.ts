import { Anthropic } from "@anthropic-ai/sdk"
import { ClineAsk, ToolName } from "@roo-code/types"
import { ProjectConfigGenerator } from "./ProjectConfigGenerator"
import * as path from "path"
import * as fs from "fs"

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
	filesGenerated?: string[]
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
			filesGenerated: [],
		}

		// Define layer-specific next steps and actions
		switch (layer) {
			case "config":
				result.nextSteps = [
					"✅ Generate project configuration files using standard tech stack",
					"Set up database schema files",
					"Configure dependencies and build tools",
					"Verify compilation and database connectivity",
				]

				// 自动生成符合技术栈约定的pom.xml
				const configGenerator = new ProjectConfigGenerator()
				const projectInfo = {
					groupId: "com.certmgr",
					artifactId: "certificate-management",
					version: "1.0-SNAPSHOT",
					name: "Certificate Management System",
					description: "DDD架构的证书管理系统",
				}

				try {
					const configResult = await configGenerator.generateStandardConfig(cwd, projectInfo)
					if (configResult.success) {
						result.filesGenerated!.push("pom.xml")
						result.message += `\n✅ Generated pom.xml with standard tech stack (Java 8, Spring Boot 2.7.18, MyBatis)`
					} else {
						result.message += `\n⚠️ Failed to generate pom.xml: ${configResult.errors.join(", ")}`
					}
				} catch (error) {
					result.message += `\n⚠️ Error generating config: ${error instanceof Error ? error.message : String(error)}`
				}
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
		let responseText = `🎯 Layer ${layer} initialized successfully.\n\n`

		if (result.filesGenerated && result.filesGenerated.length > 0) {
			responseText += `📁 Generated files:\n${result.filesGenerated.map((file) => `- ${file}`).join("\n")}\n\n`
		}

		responseText += `📋 Next steps:\n${result.nextSteps!.map((step) => `- ${step}`).join("\n")}\n\n`
		responseText += `💡 Remember to:\n- Follow DDD principles and patterns\n- Create comprehensive tests for this layer\n- Ensure proper separation of concerns\n- Verify implementation before proceeding to next layer`

		if (result.message.includes("✅") || result.message.includes("⚠️")) {
			responseText += `\n\n${result.message}`
		}

		updateCallback("ddd_init_layer", responseText)
		return responseText
	} catch (error) {
		const errorMessage = `❌ Error initializing DDD layer: ${error instanceof Error ? error.message : String(error)}`
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
