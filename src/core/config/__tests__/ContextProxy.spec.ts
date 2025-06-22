// npx vitest core/config/__tests__/ContextProxy.spec.ts

import * as vscode from "vscode"

import { GLOBAL_STATE_KEYS, SECRET_STATE_KEYS } from "@roo-code/types"

import { ContextProxy } from "../ContextProxy"

vi.mock("vscode", () => ({
	Uri: {
		file: vi.fn((path) => ({ path })),
	},
	ExtensionMode: {
		Development: 1,
		Production: 2,
		Test: 3,
	},
}))

describe("ContextProxy", () => {
	let proxy: ContextProxy
	let mockContext: any
	let mockGlobalState: any
	let mockSecrets: any

	beforeEach(async () => {
		// Reset mocks
		vi.clearAllMocks()

		// Mock globalState
		mockGlobalState = {
			get: vi.fn(),
			update: vi.fn().mockResolvedValue(undefined),
		}

		// Mock secrets
		mockSecrets = {
			get: vi.fn().mockResolvedValue("test-secret"),
			store: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(undefined),
		}

		// Mock the extension context
		mockContext = {
			globalState: mockGlobalState,
			secrets: mockSecrets,
			extensionUri: { path: "/test/extension" },
			extensionPath: "/test/extension",
			globalStorageUri: { path: "/test/storage" },
			logUri: { path: "/test/logs" },
			extension: { packageJSON: { version: "1.0.0" } },
			extensionMode: vscode.ExtensionMode.Development,
		}

		// Create proxy instance
		proxy = new ContextProxy(mockContext)
		await proxy.initialize()
	})

	describe("read-only pass-through properties", () => {
		it("should return extension properties from the original context", () => {
			expect(proxy.extensionUri).toBe(mockContext.extensionUri)
			expect(proxy.extensionPath).toBe(mockContext.extensionPath)
			expect(proxy.globalStorageUri).toBe(mockContext.globalStorageUri)
			expect(proxy.logUri).toBe(mockContext.logUri)
			expect(proxy.extension).toBe(mockContext.extension)
			expect(proxy.extensionMode).toBe(mockContext.extensionMode)
		})
	})

	describe("constructor", () => {
		it("should initialize state cache with all global state keys", () => {
			expect(mockGlobalState.get).toHaveBeenCalledTimes(GLOBAL_STATE_KEYS.length)
			for (const key of GLOBAL_STATE_KEYS) {
				expect(mockGlobalState.get).toHaveBeenCalledWith(key)
			}
		})

		it("should initialize secret cache with all secret keys", () => {
			expect(mockSecrets.get).toHaveBeenCalledTimes(SECRET_STATE_KEYS.length)
			for (const key of SECRET_STATE_KEYS) {
				expect(mockSecrets.get).toHaveBeenCalledWith(key)
			}
		})
	})

	describe("getGlobalState", () => {
		it("should return value from cache when it exists", async () => {
			// Manually set a value in the cache
			await proxy.updateGlobalState("apiProvider", "deepseek")

			// Should return the cached value
			const result = proxy.getGlobalState("apiProvider")
			expect(result).toBe("deepseek")

			// Original context should be called once during updateGlobalState
			expect(mockGlobalState.get).toHaveBeenCalledTimes(GLOBAL_STATE_KEYS.length) // Only from initialization
		})

		it("should handle default values correctly", async () => {
			// No value in cache
			const result = proxy.getGlobalState("apiProvider", "deepseek")
			expect(result).toBe("deepseek")
		})

		it("should bypass cache for pass-through state keys", async () => {
			// Setup mock return value
			mockGlobalState.get.mockReturnValue("pass-through-value")

			// Use a pass-through key (taskHistory)
			const result = proxy.getGlobalState("taskHistory")

			// Should get value directly from original context
			expect(result).toBe("pass-through-value")
			expect(mockGlobalState.get).toHaveBeenCalledWith("taskHistory")
		})

		it("should respect default values for pass-through state keys", async () => {
			// Setup mock to return undefined
			mockGlobalState.get.mockReturnValue(undefined)

			// Use a pass-through key with default value
			const historyItems = [
				{
					id: "1",
					number: 1,
					ts: 1,
					task: "test",
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 1,
				},
			]

			const result = proxy.getGlobalState("taskHistory", historyItems)

			// Should return default value when original context returns undefined
			expect(result).toBe(historyItems)
		})
	})

	describe("updateGlobalState", () => {
		it("should update state directly in original context", async () => {
			await proxy.updateGlobalState("apiProvider", "deepseek")

			// Should have called original context
			expect(mockGlobalState.update).toHaveBeenCalledWith("apiProvider", "deepseek")

			// Should have stored the value in cache
			const storedValue = await proxy.getGlobalState("apiProvider")
			expect(storedValue).toBe("deepseek")
		})

		it("should bypass cache for pass-through state keys", async () => {
			const historyItems = [
				{
					id: "1",
					number: 1,
					ts: 1,
					task: "test",
					tokensIn: 1,
					tokensOut: 1,
					totalCost: 1,
				},
			]

			await proxy.updateGlobalState("taskHistory", historyItems)

			// Should update original context
			expect(mockGlobalState.update).toHaveBeenCalledWith("taskHistory", historyItems)

			// Setup mock for subsequent get
			mockGlobalState.get.mockReturnValue(historyItems)

			// Should get fresh value from original context
			const storedValue = proxy.getGlobalState("taskHistory")
			expect(storedValue).toBe(historyItems)
			expect(mockGlobalState.get).toHaveBeenCalledWith("taskHistory")
		})
	})

	describe("getSecret", () => {
		it("should return value from cache when it exists", async () => {
			// Manually set a value in the cache
			await proxy.storeSecret("apiKey", "cached-secret")

			// Should return the cached value
			const result = proxy.getSecret("apiKey")
			expect(result).toBe("cached-secret")
		})
	})

	describe("storeSecret", () => {
		it("should store secret directly in original context", async () => {
			await proxy.storeSecret("apiKey", "new-secret")

			// Should have called original context
			expect(mockSecrets.store).toHaveBeenCalledWith("apiKey", "new-secret")

			// Should have stored the value in cache
			const storedValue = await proxy.getSecret("apiKey")
			expect(storedValue).toBe("new-secret")
		})

		it("should handle undefined value for secret deletion", async () => {
			await proxy.storeSecret("apiKey", undefined)

			// Should have called delete on original context
			expect(mockSecrets.delete).toHaveBeenCalledWith("apiKey")

			// Should have stored undefined in cache
			const storedValue = await proxy.getSecret("apiKey")
			expect(storedValue).toBeUndefined()
		})
	})

	describe("setValue", () => {
		it("should route secret keys to storeSecret", async () => {
			// Spy on storeSecret
			const storeSecretSpy = vi.spyOn(proxy, "storeSecret")

			// Test with a known secret key
			await proxy.setValue("openAiApiKey", "test-api-key")

			// Should have called storeSecret
			expect(storeSecretSpy).toHaveBeenCalledWith("openAiApiKey", "test-api-key")

			// Should have stored the value in secret cache
			const storedValue = proxy.getSecret("openAiApiKey")
			expect(storedValue).toBe("test-api-key")
		})

		it("should route global state keys to updateGlobalState", async () => {
			// Spy on updateGlobalState
			const updateGlobalStateSpy = vi.spyOn(proxy, "updateGlobalState")

			// Test with a known global state key
			await proxy.setValue("apiModelId", "gpt-4")

			// Should have called updateGlobalState
			expect(updateGlobalStateSpy).toHaveBeenCalledWith("apiModelId", "gpt-4")

			// Should have stored the value in state cache
			const storedValue = proxy.getGlobalState("apiModelId")
			expect(storedValue).toBe("gpt-4")
		})
	})

	describe("setValues", () => {
		it("should process multiple values correctly", async () => {
			// Spy on setValue
			const setValueSpy = vi.spyOn(proxy, "setValue")

			// Test with multiple values
			await proxy.setValues({
				apiModelId: "gpt-4",
				apiProvider: "openai",
				mode: "test-mode",
			})

			// Should have called setValue for each key
			expect(setValueSpy).toHaveBeenCalledTimes(3)
			expect(setValueSpy).toHaveBeenCalledWith("apiModelId", "gpt-4")
			expect(setValueSpy).toHaveBeenCalledWith("apiProvider", "openai")
			expect(setValueSpy).toHaveBeenCalledWith("mode", "test-mode")

			// Should have stored all values in state cache
			expect(proxy.getGlobalState("apiModelId")).toBe("gpt-4")
			expect(proxy.getGlobalState("apiProvider")).toBe("openai")
			expect(proxy.getGlobalState("mode")).toBe("test-mode")
		})

		it("should handle both secret and global state keys", async () => {
			// Spy on storeSecret and updateGlobalState
			const storeSecretSpy = vi.spyOn(proxy, "storeSecret")
			const updateGlobalStateSpy = vi.spyOn(proxy, "updateGlobalState")

			// Test with mixed keys
			await proxy.setValues({
				apiModelId: "gpt-4", // global state
				openAiApiKey: "test-api-key", // secret
			})

			// Should have called appropriate methods
			expect(storeSecretSpy).toHaveBeenCalledWith("openAiApiKey", "test-api-key")
			expect(updateGlobalStateSpy).toHaveBeenCalledWith("apiModelId", "gpt-4")

			// Should have stored values in appropriate caches
			expect(proxy.getSecret("openAiApiKey")).toBe("test-api-key")
			expect(proxy.getGlobalState("apiModelId")).toBe("gpt-4")
		})
	})

	describe("setProviderSettings", () => {
		it("should clear old API configuration values and set new ones", async () => {
			// Set up initial API configuration values
			await proxy.updateGlobalState("apiModelId", "old-model")
			await proxy.updateGlobalState("openAiBaseUrl", "https://old-url.com")
			await proxy.updateGlobalState("modelTemperature", 0.7)

			// Spy on setValues
			const setValuesSpy = vi.spyOn(proxy, "setValues")

			// Call setProviderSettings with new configuration
			await proxy.setProviderSettings({
				apiModelId: "new-model",
				apiProvider: "anthropic",
				// Note: openAiBaseUrl is not included in the new config
			})

			// Verify setValues was called with the correct parameters
			// It should include undefined for openAiBaseUrl (to clear it)
			// and the new values for apiModelId and apiProvider
			expect(setValuesSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					apiModelId: "new-model",
					apiProvider: "anthropic",
					openAiBaseUrl: undefined,
					modelTemperature: undefined,
				}),
			)

			// Verify the state cache has been updated correctly
			expect(proxy.getGlobalState("apiModelId")).toBe("new-model")
			expect(proxy.getGlobalState("apiProvider")).toBe("anthropic")
			expect(proxy.getGlobalState("openAiBaseUrl")).toBeUndefined()
			expect(proxy.getGlobalState("modelTemperature")).toBeUndefined()
		})

		it("should handle empty API configuration", async () => {
			// Set up initial API configuration values
			await proxy.updateGlobalState("apiModelId", "old-model")
			await proxy.updateGlobalState("openAiBaseUrl", "https://old-url.com")

			// Spy on setValues
			const setValuesSpy = vi.spyOn(proxy, "setValues")

			// Call setProviderSettings with empty configuration
			await proxy.setProviderSettings({})

			// Verify setValues was called with undefined for all existing API config keys
			expect(setValuesSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					apiModelId: undefined,
					openAiBaseUrl: undefined,
				}),
			)

			// Verify the state cache has been cleared
			expect(proxy.getGlobalState("apiModelId")).toBeUndefined()
			expect(proxy.getGlobalState("openAiBaseUrl")).toBeUndefined()
		})
	})

	describe("resetAllState", () => {
		it("should clear all in-memory caches", async () => {
			// Setup initial state in caches
			await proxy.setValues({
				apiModelId: "gpt-4", // global state
				openAiApiKey: "test-api-key", // secret
			})

			// Verify initial state
			expect(proxy.getGlobalState("apiModelId")).toBe("gpt-4")
			expect(proxy.getSecret("openAiApiKey")).toBe("test-api-key")

			// Reset all state
			await proxy.resetAllState()

			// Caches should be reinitialized with values from the context
			// Since our mock globalState.get returns undefined by default,
			// the cache should now contain undefined values
			expect(proxy.getGlobalState("apiModelId")).toBeUndefined()
		})

		it("should update all global state keys to undefined", async () => {
			// Setup initial state
			await proxy.updateGlobalState("apiModelId", "gpt-4")
			await proxy.updateGlobalState("apiProvider", "openai")

			// Reset all state
			await proxy.resetAllState()

			// Should have called update with undefined for each key
			for (const key of GLOBAL_STATE_KEYS) {
				expect(mockGlobalState.update).toHaveBeenCalledWith(key, undefined)
			}

			// Total calls should include initial setup + reset operations
			const expectedUpdateCalls = 2 + GLOBAL_STATE_KEYS.length
			expect(mockGlobalState.update).toHaveBeenCalledTimes(expectedUpdateCalls)
		})

		it("should delete all secrets", async () => {
			// Setup initial secrets
			await proxy.storeSecret("apiKey", "test-api-key")
			await proxy.storeSecret("openAiApiKey", "test-openai-key")

			// Reset all state
			await proxy.resetAllState()

			// Should have called delete for each key
			for (const key of SECRET_STATE_KEYS) {
				expect(mockSecrets.delete).toHaveBeenCalledWith(key)
			}

			// Total calls should equal the number of secret keys
			expect(mockSecrets.delete).toHaveBeenCalledTimes(SECRET_STATE_KEYS.length)
		})

		it("should reinitialize caches after reset", async () => {
			// Spy on initialization methods
			const initializeSpy = vi.spyOn(proxy as any, "initialize")

			// Reset all state
			await proxy.resetAllState()

			// Should reinitialize caches
			expect(initializeSpy).toHaveBeenCalledTimes(1)
		})
	})
})
