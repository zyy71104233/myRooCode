import * as fs from "fs"
import * as path from "path"

export interface ColumnDefinition {
	name: string
	type: string
	length?: number
	nullable: boolean
	unique: boolean
	primaryKey: boolean
	defaultValue?: string
}

export interface IndexDefinition {
	name: string
	columns: string[]
	unique: boolean
	type: "BTREE" | "HASH"
	prefixLength?: number
}

export interface TableDefinition {
	name: string
	columns: ColumnDefinition[]
	indexes: IndexDefinition[]
	engine: "InnoDB" | "MyISAM"
	charset: string
}

export interface SchemaGenerationResult {
	success: boolean
	sqlFilePath?: string
	generatedTables: TableDefinition[]
	warnings: string[]
	errors: string[]
	mysqlCompatible: boolean
}

/**
 * 数据库脚本生成工具 - 解决数据库初始化问题
 * 基于certificate_issues_combined.md中的问题2.2
 */
export class DatabaseSchemaGenerator {
	// MySQL索引长度限制（字节）
	private readonly MYSQL_INDEX_LENGTH_LIMIT = 3072

	// 不同字符集的字节数
	private readonly CHARSET_BYTES = {
		utf8: 3,
		utf8mb4: 4,
		latin1: 1,
	}

	/**
	 * 验证索引长度是否超过MySQL限制
	 */
	validateIndexLength(
		columnDefinition: ColumnDefinition,
		charset: string = "utf8mb4",
	): {
		valid: boolean
		estimatedBytes: number
		maxLength: number
		issues: string[]
		recommendations: string[]
	} {
		const issues: string[] = []
		const recommendations: string[] = []

		const bytesPerChar = this.CHARSET_BYTES[charset as keyof typeof this.CHARSET_BYTES] || 4
		const columnLength = columnDefinition.length || 255
		const estimatedBytes = columnLength * bytesPerChar

		if (estimatedBytes > this.MYSQL_INDEX_LENGTH_LIMIT) {
			issues.push(
				`列 ${columnDefinition.name} 的索引长度 ${estimatedBytes} 字节超过MySQL限制 ${this.MYSQL_INDEX_LENGTH_LIMIT} 字节`,
			)

			// 计算推荐的前缀长度
			const maxPrefixLength = Math.floor(this.MYSQL_INDEX_LENGTH_LIMIT / bytesPerChar)
			recommendations.push(`使用前缀索引，推荐长度: ${maxPrefixLength}`)
			recommendations.push(`或者将字段类型改为TEXT并使用前缀索引`)
		}

		return {
			valid: issues.length === 0,
			estimatedBytes,
			maxLength: Math.floor(this.MYSQL_INDEX_LENGTH_LIMIT / bytesPerChar),
			issues,
			recommendations,
		}
	}

	/**
	 * 为大文本字段生成优化的表结构
	 */
	generateOptimizedSchema(
		entities: Array<{
			name: string
			fields: Array<{
				name: string
				type: string
				length?: number
				nullable?: boolean
				unique?: boolean
			}>
		}>,
	): TableDefinition[] {
		return entities.map((entity) => {
			const columns: ColumnDefinition[] = []
			const indexes: IndexDefinition[] = []

			// 添加主键ID列
			columns.push({
				name: "id",
				type: "BIGINT",
				nullable: false,
				unique: true,
				primaryKey: true,
			})

			// 处理实体字段
			entity.fields.forEach((field) => {
				const column = this.optimizeColumnDefinition(field)
				columns.push(column)

				// 为唯一字段创建索引
				if (field.unique) {
					const indexDef = this.createOptimizedIndex(field, column)
					if (indexDef) {
						indexes.push(indexDef)
					}
				}
			})

			// 添加审计字段
			columns.push(
				{
					name: "created_at",
					type: "TIMESTAMP",
					nullable: false,
					unique: false,
					primaryKey: false,
					defaultValue: "CURRENT_TIMESTAMP",
				},
				{
					name: "updated_at",
					type: "TIMESTAMP",
					nullable: false,
					unique: false,
					primaryKey: false,
					defaultValue: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
				},
			)

			return {
				name: this.toSnakeCase(entity.name),
				columns,
				indexes,
				engine: "InnoDB",
				charset: "utf8mb4",
			}
		})
	}

	/**
	 * 优化列定义
	 */
	private optimizeColumnDefinition(field: {
		name: string
		type: string
		length?: number
		nullable?: boolean
		unique?: boolean
	}): ColumnDefinition {
		const column: ColumnDefinition = {
			name: this.toSnakeCase(field.name),
			type: field.type.toUpperCase(),
			length: field.length,
			nullable: field.nullable !== false,
			unique: field.unique || false,
			primaryKey: false,
		}

		// 对于大文本字段，使用TEXT类型
		if (field.type.toUpperCase() === "VARCHAR" && field.length && field.length > 1000) {
			column.type = "TEXT"
			column.length = undefined // TEXT类型不需要长度
		}

		// 对于可能很长的字符串字段，使用TEXT
		if (
			field.name.toLowerCase().includes("content") ||
			field.name.toLowerCase().includes("description") ||
			field.name.toLowerCase().includes("data")
		) {
			column.type = "TEXT"
			column.length = undefined
		}

		return column
	}

	/**
	 * 创建优化的索引
	 */
	private createOptimizedIndex(
		field: {
			name: string
			type: string
			length?: number
			unique?: boolean
		},
		column: ColumnDefinition,
	): IndexDefinition | null {
		if (!field.unique) return null

		const indexName = `idx_${this.toSnakeCase(field.name)}`

		// 对于TEXT字段或长VARCHAR字段，使用前缀索引
		if (column.type === "TEXT" || (column.length && column.length > 255)) {
			return {
				name: indexName,
				columns: [column.name],
				unique: true,
				type: "BTREE",
				prefixLength: 255, // 使用前缀索引
			}
		}

		return {
			name: indexName,
			columns: [column.name],
			unique: true,
			type: "BTREE",
		}
	}

	/**
	 * 生成SQL DDL语句
	 */
	generateSQL(tables: TableDefinition[]): string {
		let sql = `-- Generated schema for DDD architecture
-- Auto-optimized for MySQL compatibility
-- Generated at: ${new Date().toISOString()}

SET FOREIGN_KEY_CHECKS = 0;

`

		// 生成表结构
		tables.forEach((table) => {
			sql += this.generateTableSQL(table)
			sql += "\n"
		})

		sql += "SET FOREIGN_KEY_CHECKS = 1;\n"

		return sql
	}

	/**
	 * 生成单个表的SQL
	 */
	private generateTableSQL(table: TableDefinition): string {
		let sql = `-- Table: ${table.name}\n`
		sql += `DROP TABLE IF EXISTS \`${table.name}\`;\n`
		sql += `CREATE TABLE \`${table.name}\` (\n`

		// 生成列定义
		const columnDefs = table.columns.map((column) => {
			let def = `  \`${column.name}\` ${column.type}`

			if (column.length && column.type !== "TEXT") {
				def += `(${column.length})`
			}

			if (!column.nullable) {
				def += " NOT NULL"
			}

			if (column.defaultValue) {
				def += ` DEFAULT ${column.defaultValue}`
			}

			return def
		})

		sql += columnDefs.join(",\n")

		// 添加主键
		const primaryKeys = table.columns.filter((col) => col.primaryKey).map((col) => col.name)
		if (primaryKeys.length > 0) {
			sql += `,\n  PRIMARY KEY (\`${primaryKeys.join("`, `")}\`)`
		}

		// 添加唯一索引
		table.indexes.forEach((index) => {
			sql += `,\n  `
			if (index.unique) {
				sql += "UNIQUE "
			}
			sql += `KEY \`${index.name}\` (`

			if (index.prefixLength) {
				sql += `\`${index.columns[0]}\`(${index.prefixLength})`
			} else {
				sql += index.columns.map((col) => `\`${col}\``).join(", ")
			}

			sql += ")"
		})

		sql += `\n) ENGINE=${table.engine} DEFAULT CHARSET=${table.charset};\n\n`

		return sql
	}

	/**
	 * 验证生成的schema是否兼容MySQL
	 */
	validateMySQLCompatibility(tables: TableDefinition[]): {
		compatible: boolean
		issues: string[]
		warnings: string[]
		recommendations: string[]
	} {
		const issues: string[] = []
		const warnings: string[] = []
		const recommendations: string[] = []

		tables.forEach((table) => {
			// 检查表名长度
			if (table.name.length > 64) {
				issues.push(`表名 ${table.name} 超过MySQL 64字符限制`)
			}

			// 检查列定义
			table.columns.forEach((column) => {
				// 检查列名长度
				if (column.name.length > 64) {
					issues.push(`列名 ${column.name} 超过MySQL 64字符限制`)
				}

				// 检查索引长度
				if (column.unique || column.primaryKey) {
					const validation = this.validateIndexLength(column, table.charset)
					if (!validation.valid) {
						issues.push(...validation.issues)
						recommendations.push(...validation.recommendations)
					}
				}
			})

			// 检查索引
			table.indexes.forEach((index) => {
				if (index.name.length > 64) {
					issues.push(`索引名 ${index.name} 超过MySQL 64字符限制`)
				}
			})
		})

		return {
			compatible: issues.length === 0,
			issues,
			warnings,
			recommendations,
		}
	}

	/**
	 * 生成并保存schema文件
	 */
	async generateAndSaveSchema(
		cwd: string,
		entities: Array<{
			name: string
			fields: Array<{
				name: string
				type: string
				length?: number
				nullable?: boolean
				unique?: boolean
			}>
		}>,
		filename: string = "schema.sql",
	): Promise<SchemaGenerationResult> {
		const warnings: string[] = []
		const errors: string[] = []

		try {
			// 生成优化的表定义
			const tables = this.generateOptimizedSchema(entities)

			// 验证MySQL兼容性
			const compatibility = this.validateMySQLCompatibility(tables)
			if (!compatibility.compatible) {
				warnings.push(...compatibility.issues)
				warnings.push(...compatibility.warnings)
			}

			// 生成SQL
			const sql = this.generateSQL(tables)

			// 保存到文件
			const sqlFilePath = path.join(cwd, "src", "main", "resources", filename)

			// 确保目录存在
			const dir = path.dirname(sqlFilePath)
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true })
			}

			fs.writeFileSync(sqlFilePath, sql, "utf-8")

			return {
				success: true,
				sqlFilePath,
				generatedTables: tables,
				warnings,
				errors,
				mysqlCompatible: compatibility.compatible,
			}
		} catch (error) {
			errors.push(`Schema生成失败: ${error instanceof Error ? error.message : String(error)}`)
			return {
				success: false,
				generatedTables: [],
				warnings,
				errors,
				mysqlCompatible: false,
			}
		}
	}

	/**
	 * 分析现有schema文件的问题
	 */
	analyzeExistingSchema(schemaFilePath: string): {
		issues: string[]
		recommendations: string[]
		mysqlCompatible: boolean
	} {
		const issues: string[] = []
		const recommendations: string[] = []

		try {
			const content = fs.readFileSync(schemaFilePath, "utf-8")

			// 检查长VARCHAR字段
			const longVarcharMatches = content.match(/VARCHAR\((\d+)\)/g)
			if (longVarcharMatches) {
				longVarcharMatches.forEach((match) => {
					const length = parseInt(match.match(/\d+/)?.[0] || "0")
					if (length > 1000) {
						issues.push(`发现长VARCHAR字段: ${match}，可能导致索引问题`)
						recommendations.push(`考虑将${match}改为TEXT类型并使用前缀索引`)
					}
				})
			}

			// 检查是否有超长索引
			const uniqueKeyMatches = content.match(/UNIQUE KEY[^(]*\([^)]+\)/g)
			if (uniqueKeyMatches) {
				uniqueKeyMatches.forEach((match) => {
					if (!match.includes("(") || !match.includes(")")) return

					// 简单检查是否可能是长字段索引
					if (match.includes("VARCHAR") && !match.match(/\(\d+\)/)) {
						issues.push(`可能存在长字段索引: ${match}`)
						recommendations.push("为长字段添加前缀索引，如: KEY idx_field (field(255))")
					}
				})
			}

			return {
				issues,
				recommendations,
				mysqlCompatible: issues.length === 0,
			}
		} catch (error) {
			issues.push(`分析schema文件失败: ${error instanceof Error ? error.message : String(error)}`)
			return {
				issues,
				recommendations: ["检查文件是否存在且可读"],
				mysqlCompatible: false,
			}
		}
	}

	// 辅助方法
	private toSnakeCase(str: string): string {
		return str
			.replace(/([A-Z])/g, "_$1")
			.toLowerCase()
			.replace(/^_/, "")
	}
}
