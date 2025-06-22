import { Anthropic } from "@anthropic-ai/sdk"
import { ClineAsk, ToolName } from "@roo-code/types"
import { DddWorkflowManager } from "./DddWorkflowManager"

export interface DddWorkflowStatusParams {
	// 无参数，显示当前状态
}

export async function executeDddWorkflowStatus(
	params: DddWorkflowStatusParams,
	cwd: string,
	askCallback: (type: ClineAsk, message?: string) => Promise<boolean>,
	updateCallback: (type: ToolName, content: string) => void,
): Promise<string> {
	try {
		const workflowManager = new DddWorkflowManager(cwd)
		const state = workflowManager.getState()
		const currentLayer = workflowManager.getCurrentLayer()

		let report = `🏗️ DDD工作流状态报告\n\n`

		// 基本状态信息
		report += `📊 当前状态:\n`
		report += `  • 当前层级: ${currentLayer}\n`
		report += `  • 层级进行中: ${state.layerInProgress ? "是" : "否"}\n`
		report += `  • 最后操作: ${state.lastAction}\n`
		report += `  • 更新时间: ${new Date(state.timestamp).toLocaleString()}\n\n`

		// 完成进度
		report += workflowManager.getCompletionReport()

		// 下一步建议
		report += `\n📋 建议的下一步操作:\n`

		if (state.layerInProgress) {
			report += `1. 继续完成当前层级 (${currentLayer}) 的开发\n`
			report += `2. 使用 ddd_verify_layer 验证当前层级\n`
			report += `3. 使用 ddd_layer_complete 标记层级完成\n`
		} else {
			const nextLayer = workflowManager.getNextLayer(currentLayer)
			if (nextLayer) {
				report += `1. 使用 ddd_init_layer 初始化下一层级 (${nextLayer})\n`
				report += `2. 开始 ${nextLayer} 层级的开发工作\n`
			} else {
				report += `1. 所有层级已完成，进行最终集成测试\n`
				report += `2. 生成项目文档\n`
				report += `3. 部署和发布\n`
			}
		}

		// 故障排除信息
		if (state.lastAction.includes("error") || state.lastAction.includes("failed")) {
			report += `\n⚠️ 检测到错误状态:\n`
			report += `  • 最后操作: ${state.lastAction}\n`
			report += `  • 建议: 检查错误日志并重新执行失败的操作\n`
		}

		updateCallback("ddd_workflow_status", report)
		return report
	} catch (error) {
		const errorMessage = `Error getting DDD workflow status: ${error instanceof Error ? error.message : String(error)}`
		updateCallback("ddd_workflow_status", errorMessage)
		return errorMessage
	}
}

export function getDddWorkflowStatusDescription(): string {
	return `Display the current status of the DDD layered development workflow. This tool shows:

- Current layer being worked on
- Completed layers
- Overall progress
- Next recommended actions
- Workflow state information

This tool helps track progress and provides guidance on what to do next in the DDD development process.

No parameters required - simply call this tool to get a comprehensive status report.`
}
