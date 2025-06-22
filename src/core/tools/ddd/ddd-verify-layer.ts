import { Anthropic } from "@anthropic-ai/sdk"
import { ClineAsk, ToolName } from "@roo-code/types"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"

const execAsync = promisify(exec)

export interface DddVerifyLayerParams {
	layer: "config" | "domain" | "infrastructure" | "application" | "interface"
	testCommand?: string
	validationChecks?: string[]
}

export type DddVerificationResult = {
	layer: string
	passed: boolean
	testResults: string[]
	errors: string[]
	warnings: string[]
	score: number // 0-100
}

export async function executeDddVerifyLayer(
	params: DddVerifyLayerParams,
	cwd: string,
	askCallback: (type: ClineAsk, message?: string) => Promise<boolean>,
	updateCallback: (type: ToolName, content: string) => void,
): Promise<string> {
	try {
		const { layer, testCommand, validationChecks } = params

		// Validate layer type
		const validLayers = ["config", "domain", "infrastructure", "application", "interface"]
		if (!validLayers.includes(layer)) {
			throw new Error(`Invalid layer: ${layer}. Must be one of: ${validLayers.join(", ")}`)
		}

		const result: DddVerificationResult = {
			layer,
			passed: false,
			testResults: [],
			errors: [],
			warnings: [],
			score: 0,
		}

		// Layer-specific validation
		switch (layer) {
			case "config":
				await validateConfigLayer(cwd, result)
				break
			case "domain":
				await validateDomainLayer(cwd, result, testCommand)
				break
			case "infrastructure":
				await validateInfrastructureLayer(cwd, result, testCommand)
				break
			case "application":
				await validateApplicationLayer(cwd, result, testCommand)
				break
			case "interface":
				await validateInterfaceLayer(cwd, result, testCommand)
				break
		}

		// Calculate score
		const totalChecks = result.testResults.length + result.errors.length
		const passedChecks = result.testResults.length
		result.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0
		result.passed = result.score >= 80 && result.errors.length === 0

		// Format response
		let responseText = formatVerificationReport(result)

		updateCallback("ddd_verify_layer", responseText)
		return responseText
	} catch (error) {
		const errorMessage = `Error verifying DDD layer: ${error instanceof Error ? error.message : String(error)}`
		updateCallback("ddd_verify_layer", errorMessage)
		return errorMessage
	}
}

async function validateConfigLayer(cwd: string, result: DddVerificationResult): Promise<void> {
	// Check for build files
	const buildFiles = ["pom.xml", "build.gradle", "package.json"]
	let foundBuildFile = false

	for (const file of buildFiles) {
		if (fs.existsSync(path.join(cwd, file))) {
			result.testResults.push(`✅ Found build configuration: ${file}`)
			foundBuildFile = true
			break
		}
	}

	if (!foundBuildFile) {
		result.errors.push("❌ No build configuration file found")
	}
}

async function validateDomainLayer(cwd: string, result: DddVerificationResult, testCommand?: string): Promise<void> {
	const domainPaths = ["src/main/java/domain", "src/domain", "domain"]
	let foundDomainPath = false

	for (const domainPath of domainPaths) {
		if (fs.existsSync(path.join(cwd, domainPath))) {
			result.testResults.push(`✅ Found domain structure: ${domainPath}`)
			foundDomainPath = true
			break
		}
	}

	if (!foundDomainPath) {
		result.warnings.push("⚠️ No standard domain directory found")
	}
}

async function validateInfrastructureLayer(
	cwd: string,
	result: DddVerificationResult,
	testCommand?: string,
): Promise<void> {
	const infraPaths = ["src/main/java/infrastructure", "src/infrastructure", "infrastructure"]
	let foundInfraPath = false

	for (const infraPath of infraPaths) {
		if (fs.existsSync(path.join(cwd, infraPath))) {
			result.testResults.push(`✅ Found infrastructure structure: ${infraPath}`)
			foundInfraPath = true
			break
		}
	}

	if (!foundInfraPath) {
		result.warnings.push("⚠️ No standard infrastructure directory found")
	}
}

async function validateApplicationLayer(
	cwd: string,
	result: DddVerificationResult,
	testCommand?: string,
): Promise<void> {
	const appPaths = ["src/main/java/application", "src/application", "application"]
	let foundAppPath = false

	for (const appPath of appPaths) {
		if (fs.existsSync(path.join(cwd, appPath))) {
			result.testResults.push(`✅ Found application structure: ${appPath}`)
			foundAppPath = true
			break
		}
	}

	if (!foundAppPath) {
		result.warnings.push("⚠️ No standard application directory found")
	}
}

async function validateInterfaceLayer(cwd: string, result: DddVerificationResult, testCommand?: string): Promise<void> {
	const interfacePaths = ["src/main/java/interfaces", "src/interfaces", "interfaces"]
	let foundInterfacePath = false

	for (const interfacePath of interfacePaths) {
		if (fs.existsSync(path.join(cwd, interfacePath))) {
			result.testResults.push(`✅ Found interface structure: ${interfacePath}`)
			foundInterfacePath = true
			break
		}
	}

	if (!foundInterfacePath) {
		result.warnings.push("⚠️ No standard interface directory found")
	}
}

function formatVerificationReport(result: DddVerificationResult): string {
	let report = `🔍 ${result.layer.toUpperCase()} Layer Verification Report\n\n`

	report += `📊 Score: ${result.score}/100 ${result.passed ? "✅ PASSED" : "❌ FAILED"}\n\n`

	if (result.testResults.length > 0) {
		report += `✅ Passed:\n${result.testResults.map((test) => `  ${test}`).join("\n")}\n\n`
	}

	if (result.warnings.length > 0) {
		report += `⚠️ Warnings:\n${result.warnings.map((warning) => `  ${warning}`).join("\n")}\n\n`
	}

	if (result.errors.length > 0) {
		report += `❌ Errors:\n${result.errors.map((error) => `  ${error}`).join("\n")}\n\n`
	}

	return report
}

export function getDddVerifyLayerDescription(): string {
	return `Verify the implementation quality of a DDD layer.

Parameters:
- layer (required): The layer to verify ("config", "domain", "infrastructure", "application", "interface")
- testCommand (optional): Custom test command to run
- validationChecks (optional): Array of custom validation commands

Performs layer-specific validation and returns a detailed report with score.`
}
