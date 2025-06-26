import * as fs from "fs"
import * as path from "path"

export type DddLayer = "config" | "domain" | "infrastructure" | "application" | "interface"

export interface DddWorkflowState {
	currentLayer?: DddLayer
	completedLayers: DddLayer[]
	layerInProgress: boolean
	lastAction: string
	timestamp: number
}

/**
 * DDD工作流管理器 - 解决状态管理和层级跟踪问题
 */
export class DddWorkflowManager {
	private stateFile: string
	private state: DddWorkflowState

	constructor(private cwd: string) {
		this.stateFile = path.join(cwd, ".roo", "ddd-workflow-state.json")
		this.state = this.loadState()
	}

	/**
	 * 加载工作流状态
	 */
	private loadState(): DddWorkflowState {
		try {
			if (fs.existsSync(this.stateFile)) {
				const content = fs.readFileSync(this.stateFile, "utf-8")
				return JSON.parse(content)
			}
		} catch (error) {
			console.warn("Failed to load DDD workflow state:", error)
		}

		return {
			completedLayers: [],
			layerInProgress: false,
			lastAction: "none",
			timestamp: Date.now(),
		}
	}

	/**
	 * 保存工作流状态
	 */
	private saveState(): void {
		try {
			const rooDir = path.dirname(this.stateFile)
			if (!fs.existsSync(rooDir)) {
				fs.mkdirSync(rooDir, { recursive: true })
			}

			this.state.timestamp = Date.now()
			fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2))
		} catch (error) {
			console.warn("Failed to save DDD workflow state:", error)
		}
	}

	/**
	 * 推断当前应该处于的层级
	 */
	inferCurrentLayer(): DddLayer {
		// 如果有明确的当前层级，返回它
		if (this.state.currentLayer) {
			return this.state.currentLayer
		}

		// 基于项目文件结构推断层级
		const layerOrder: DddLayer[] = ["config", "domain", "infrastructure", "application", "interface"]

		// 检查配置文件
		const hasPom = fs.existsSync(path.join(this.cwd, "pom.xml"))
		const hasGradle = fs.existsSync(path.join(this.cwd, "build.gradle"))
		const hasPackageJson = fs.existsSync(path.join(this.cwd, "package.json"))

		if (!hasPom && !hasGradle && !hasPackageJson) {
			return "config"
		}

		// 检查领域层文件
		const domainDirs = [
			path.join(this.cwd, "src/main/java"),
			path.join(this.cwd, "dddsrc/main/java"),
			path.join(this.cwd, "src"),
		]

		let hasDomainFiles = false
		for (const dir of domainDirs) {
			if (this.hasJavaFilesInDirectory(dir, "domain/model")) {
				hasDomainFiles = true
				break
			}
		}

		if (!hasDomainFiles) {
			return "domain"
		}

		// 检查基础设施层文件
		let hasInfrastructureFiles = false
		for (const dir of domainDirs) {
			if (
				this.hasJavaFilesInDirectory(dir, "infrastructure") ||
				this.hasJavaFilesInDirectory(dir, "domain/repository")
			) {
				hasInfrastructureFiles = true
				break
			}
		}

		if (!hasInfrastructureFiles) {
			return "infrastructure"
		}

		// 检查应用层文件
		let hasApplicationFiles = false
		for (const dir of domainDirs) {
			if (this.hasJavaFilesInDirectory(dir, "application")) {
				hasApplicationFiles = true
				break
			}
		}

		if (!hasApplicationFiles) {
			return "application"
		}

		// 默认返回接口层
		return "interface"
	}

	/**
	 * 检查目录中是否有Java文件
	 */
	private hasJavaFilesInDirectory(baseDir: string, subPath: string): boolean {
		const fullPath = path.join(baseDir, subPath)
		if (!fs.existsSync(fullPath)) {
			return false
		}

		try {
			const files = fs.readdirSync(fullPath, { recursive: true })
			return files.some((file) => typeof file === "string" && file.endsWith(".java"))
		} catch {
			return false
		}
	}

	/**
	 * 获取当前层级
	 */
	getCurrentLayer(): DddLayer {
		if (!this.state.currentLayer) {
			this.state.currentLayer = this.inferCurrentLayer()
			this.saveState()
		}
		return this.state.currentLayer
	}

	/**
	 * 设置当前层级
	 */
	setCurrentLayer(layer: DddLayer): void {
		this.state.currentLayer = layer
		this.state.layerInProgress = true
		this.state.lastAction = `layer_started_${layer}`
		this.saveState()
	}

	/**
	 * 标记层级完成
	 */
	markLayerComplete(layer: DddLayer): void {
		if (!this.state.completedLayers.includes(layer)) {
			this.state.completedLayers.push(layer)
		}
		this.state.layerInProgress = false
		this.state.lastAction = `layer_completed_${layer}`

		// 自动设置下一层
		const nextLayer = this.getNextLayer(layer)
		if (nextLayer) {
			this.state.currentLayer = nextLayer
		}

		this.saveState()
	}

	/**
	 * 获取下一层级
	 */
	getNextLayer(currentLayer: DddLayer): DddLayer | null {
		const layerOrder: DddLayer[] = ["config", "domain", "infrastructure", "application", "interface"]
		const currentIndex = layerOrder.indexOf(currentLayer)

		if (currentIndex >= 0 && currentIndex < layerOrder.length - 1) {
			return layerOrder[currentIndex + 1]
		}

		return null
	}

	/**
	 * 检查层级是否已完成
	 */
	isLayerCompleted(layer: DddLayer): boolean {
		return this.state.completedLayers.includes(layer)
	}

	/**
	 * 获取工作流状态
	 */
	getState(): DddWorkflowState {
		return { ...this.state }
	}

	/**
	 * 重置工作流状态
	 */
	resetWorkflow(): void {
		this.state = {
			completedLayers: [],
			layerInProgress: false,
			lastAction: "reset",
			timestamp: Date.now(),
		}
		this.saveState()
	}

	/**
	 * 验证层级参数
	 */
	validateLayer(layer: string): DddLayer {
		const validLayers: DddLayer[] = ["config", "domain", "infrastructure", "application", "interface"]

		// 如果提供了有效的层级，使用它
		if (validLayers.includes(layer as DddLayer)) {
			return layer as DddLayer
		}

		// 如果层级无效或为空，使用当前推断的层级
		const inferredLayer = this.getCurrentLayer()
		// 只在layer不为空但无效时显示警告，为空时静默处理
		if (layer && layer.trim() !== "") {
			console.log(`Invalid layer parameter: "${layer}", using inferred layer: ${inferredLayer}`)
		}
		return inferredLayer
	}

	/**
	 * 获取层级完成报告
	 */
	getCompletionReport(): string {
		const completed = this.state.completedLayers
		const current = this.getCurrentLayer()
		const total = 5 // 总共5个层级

		let report = `🏗️ DDD项目进度报告\n\n`
		report += `📊 完成进度: ${completed.length}/${total} 层级\n\n`

		const layerOrder: DddLayer[] = ["config", "domain", "infrastructure", "application", "interface"]
		layerOrder.forEach((layer) => {
			const status = completed.includes(layer) ? "✅" : layer === current ? "🔄" : "⏳"
			const name = this.getLayerDisplayName(layer)
			report += `${status} ${name}\n`
		})

		report += `\n🎯 当前层级: ${this.getLayerDisplayName(current)}\n`

		if (completed.length === total) {
			report += `\n🎉 所有DDD层级已完成！`
		}

		return report
	}

	/**
	 * 获取层级显示名称
	 */
	private getLayerDisplayName(layer: DddLayer): string {
		const names = {
			config: "配置层 (Configuration)",
			domain: "领域层 (Domain)",
			infrastructure: "基础设施层 (Infrastructure)",
			application: "应用层 (Application)",
			interface: "接口层 (Interface)",
		}
		return names[layer]
	}
}
