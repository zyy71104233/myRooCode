import { Anthropic } from "@anthropic-ai/sdk"
import { ClineAsk, ToolName } from "@roo-code/types"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"

const execAsync = promisify(exec)

export interface VerifyCompilationParams {
	buildCommand?: string
	timeout?: number
}

export async function executeVerifyCompilation(
	params: VerifyCompilationParams,
	cwd: string,
	askCallback: (type: ClineAsk, message?: string) => Promise<boolean>,
	updateCallback: (type: ToolName, content: string) => void,
): Promise<string> {
	try {
		const { buildCommand, timeout = 120000 } = params

		// Auto-detect build system
		let command = buildCommand
		if (!command) {
			if (fs.existsSync(path.join(cwd, "pom.xml"))) {
				command = "mvn compile"
			} else if (fs.existsSync(path.join(cwd, "build.gradle"))) {
				command = "gradle compileJava"
			} else if (fs.existsSync(path.join(cwd, "package.json"))) {
				command = "npm run build"
			} else {
				throw new Error("No build configuration found (pom.xml, build.gradle, package.json)")
			}
		}

		// Execute compilation
		const { stdout, stderr } = await execAsync(command, {
			cwd,
			timeout,
			maxBuffer: 1024 * 1024 * 10, // 10MB buffer
		})

		let report = "✅ Compilation Verification Report\n\n"
		report += `Command: ${command}\n`
		report += `Status: SUCCESS\n\n`

		if (stdout) {
			report += `Output:\n${stdout}\n\n`
		}

		if (stderr) {
			report += `Warnings/Info:\n${stderr}\n\n`
		}

		updateCallback("verify_compilation", report)
		return report
	} catch (error) {
		let errorReport = "❌ Compilation Verification Failed\n\n"
		errorReport += `Error: ${error instanceof Error ? error.message : String(error)}\n\n`

		updateCallback("verify_compilation", errorReport)
		return errorReport
	}
}

export function getVerifyCompilationDescription(): string {
	return `Verify that the project compiles successfully.

Parameters:
- buildCommand (optional): Custom build command to run
- timeout (optional): Timeout in milliseconds (default: 120000)

Auto-detects build system (Maven, Gradle, NPM) if no command specified.`
}
