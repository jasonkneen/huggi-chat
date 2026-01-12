/**
 * Tool Format Parser
 *
 * Handles different model-specific tool call output formats.
 * Models use various formats for tool/function calls:
 *
 * 1. OpenAI-style: Standard tool_calls array in response
 * 2. MiniMax-style: XML tags <minimax:tool_call>
 * 3. Anthropic-style: <tool_use> blocks
 * 4. Hermes-style: <tool_call> JSON blocks
 * 5. Qwen-style: ✿FUNCTION✿ markers
 *
 * This module normalizes all formats to a standard structure.
 */

import type { OpenAiTool } from "$lib/server/mcp/tools";

export interface NormalizedToolCall {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
}

export type ToolFormat =
	| "openai" // Standard OpenAI tool_calls
	| "minimax" // <minimax:tool_call> XML
	| "anthropic" // <tool_use> blocks
	| "hermes" // <tool_call> JSON
	| "qwen" // ✿FUNCTION✿ markers
	| "glm" // GLM function call format
	| "deepseek" // DeepSeek may use custom format
	| "auto"; // Auto-detect from content

/**
 * Model ID patterns mapped to their tool call format
 */
const MODEL_FORMAT_PATTERNS: Array<{ pattern: RegExp; format: ToolFormat }> = [
	// MiniMax models use XML format
	{ pattern: /^MiniMaxAI\//i, format: "minimax" },
	{ pattern: /minimax/i, format: "minimax" },

	// Hermes models use <tool_call> JSON
	{ pattern: /hermes/i, format: "hermes" },
	{ pattern: /NousResearch\/Hermes/i, format: "hermes" },

	// Qwen models - newer versions support OpenAI format, but some use custom
	{ pattern: /Qwen\/Qwen[23].*(?!Coder)/i, format: "openai" },

	// GLM models may use custom format
	{ pattern: /zai-org\/GLM/i, format: "glm" },
	{ pattern: /zai-org\/AutoGLM/i, format: "glm" },

	// DeepSeek generally follows OpenAI format
	{ pattern: /deepseek/i, format: "openai" },

	// Cohere Command models use OpenAI format
	{ pattern: /CohereLabs\/c4ai-command/i, format: "openai" },
	{ pattern: /CohereLabs\/command/i, format: "openai" },

	// Meta Llama models use OpenAI format
	{ pattern: /meta-llama\//i, format: "openai" },

	// Google Gemma uses OpenAI format
	{ pattern: /google\/gemma/i, format: "openai" },
];

/**
 * Detect the tool format for a given model ID
 */
export function detectToolFormat(modelId: string): ToolFormat {
	for (const { pattern, format } of MODEL_FORMAT_PATTERNS) {
		if (pattern.test(modelId)) {
			return format;
		}
	}
	return "openai"; // Default to OpenAI format
}

/**
 * Auto-detect format from content by looking for format markers
 */
export function detectFormatFromContent(content: string): ToolFormat {
	if (content.includes("<minimax:tool_call>")) return "minimax";
	if (content.includes("<tool_use>")) return "anthropic";
	if (content.includes("<tool_call>") && content.includes('"name"')) return "hermes";
	if (content.includes("✿FUNCTION✿")) return "qwen";
	if (content.includes("```json") && content.includes('"function"')) return "hermes";
	return "openai";
}

/**
 * Parse MiniMax XML tool call format
 *
 * Format:
 * <minimax:tool_call>
 * <invoke name="tool-name">
 * <parameter name="param-key">param-value</parameter>
 * </invoke>
 * </minimax:tool_call>
 */
export function parseMiniMaxToolCalls(
	content: string,
	tools?: OpenAiTool[]
): NormalizedToolCall[] {
	if (!content.includes("<minimax:tool_call>")) {
		return [];
	}

	const toolCalls: NormalizedToolCall[] = [];
	const toolCallRegex = /<minimax:tool_call>([\s\S]*?)<\/minimax:tool_call>/g;
	const invokeRegex = /<invoke name=["']?([^"'>]+)["']?>([\s\S]*?)<\/invoke>/g;
	const paramRegex = /<parameter name=["']?([^"'>]+)["']?>([\s\S]*?)<\/parameter>/g;

	let toolCallId = 0;

	for (const toolCallMatch of content.matchAll(toolCallRegex)) {
		const toolCallContent = toolCallMatch[1];

		for (const invokeMatch of toolCallContent.matchAll(invokeRegex)) {
			const functionName = invokeMatch[1].trim();
			const invokeContent = invokeMatch[2];

			// Build parameter config from tool definitions
			const paramConfig: Record<string, { type: string }> = {};
			if (tools) {
				const toolDef = tools.find((t) => t.function.name === functionName);
				if (toolDef?.function.parameters) {
					const props = (toolDef.function.parameters as { properties?: Record<string, unknown> })
						.properties;
					if (props) {
						for (const [key, value] of Object.entries(props)) {
							const typedValue = value as { type?: string };
							paramConfig[key] = { type: typedValue.type || "string" };
						}
					}
				}
			}

			// Extract parameters
			const args: Record<string, unknown> = {};
			for (const paramMatch of invokeContent.matchAll(paramRegex)) {
				const paramName = paramMatch[1].trim();
				let paramValue = paramMatch[2].trim();

				// Clean up whitespace
				if (paramValue.startsWith("\n")) paramValue = paramValue.slice(1);
				if (paramValue.endsWith("\n")) paramValue = paramValue.slice(0, -1);

				// Convert based on type
				const paramType = paramConfig[paramName]?.type || "string";
				args[paramName] = convertParamValue(paramValue, paramType);
			}

			toolCalls.push({
				id: `minimax_call_${toolCallId++}`,
				name: functionName,
				arguments: args,
			});
		}
	}

	return toolCalls;
}

/**
 * Parse Hermes/generic <tool_call> JSON format
 *
 * Format:
 * <tool_call>
 * {"name": "function_name", "arguments": {...}}
 * </tool_call>
 */
export function parseHermesToolCalls(content: string): NormalizedToolCall[] {
	const toolCalls: NormalizedToolCall[] = [];
	const toolCallRegex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;

	let toolCallId = 0;

	for (const match of content.matchAll(toolCallRegex)) {
		try {
			const jsonContent = match[1].trim();
			const parsed = JSON.parse(jsonContent);

			if (parsed.name) {
				toolCalls.push({
					id: `hermes_call_${toolCallId++}`,
					name: parsed.name,
					arguments: typeof parsed.arguments === "string"
						? JSON.parse(parsed.arguments)
						: (parsed.arguments || {}),
				});
			}
		} catch {
			// Try to extract from markdown code block
			const codeBlockMatch = match[1].match(/```json\s*([\s\S]*?)\s*```/);
			if (codeBlockMatch) {
				try {
					const parsed = JSON.parse(codeBlockMatch[1].trim());
					if (parsed.name) {
						toolCalls.push({
							id: `hermes_call_${toolCallId++}`,
							name: parsed.name,
							arguments: typeof parsed.arguments === "string"
								? JSON.parse(parsed.arguments)
								: (parsed.arguments || {}),
						});
					}
				} catch {
					// Skip malformed JSON
				}
			}
		}
	}

	return toolCalls;
}

/**
 * Parse Anthropic <tool_use> format
 *
 * Format:
 * <tool_use>
 * <tool_name>function_name</tool_name>
 * <parameters>{"key": "value"}</parameters>
 * </tool_use>
 */
export function parseAnthropicToolCalls(content: string): NormalizedToolCall[] {
	const toolCalls: NormalizedToolCall[] = [];
	const toolUseRegex = /<tool_use>([\s\S]*?)<\/tool_use>/g;

	let toolCallId = 0;

	for (const match of content.matchAll(toolUseRegex)) {
		const toolContent = match[1];
		const nameMatch = toolContent.match(/<tool_name>([\s\S]*?)<\/tool_name>/);
		const paramsMatch = toolContent.match(/<parameters>([\s\S]*?)<\/parameters>/);

		if (nameMatch) {
			let args: Record<string, unknown> = {};
			if (paramsMatch) {
				try {
					args = JSON.parse(paramsMatch[1].trim());
				} catch {
					// Keep empty args
				}
			}

			toolCalls.push({
				id: `anthropic_call_${toolCallId++}`,
				name: nameMatch[1].trim(),
				arguments: args,
			});
		}
	}

	return toolCalls;
}

/**
 * Parse Qwen ✿FUNCTION✿ format
 *
 * Format:
 * ✿FUNCTION✿: function_name
 * ✿ARGS✿: {"key": "value"}
 */
export function parseQwenToolCalls(content: string): NormalizedToolCall[] {
	const toolCalls: NormalizedToolCall[] = [];
	const functionRegex = /✿FUNCTION✿:\s*(\S+)\s*✿ARGS✿:\s*([\s\S]*?)(?=✿FUNCTION✿|$)/g;

	let toolCallId = 0;

	for (const match of content.matchAll(functionRegex)) {
		const functionName = match[1].trim();
		let args: Record<string, unknown> = {};

		try {
			const argsText = match[2].trim();
			if (argsText) {
				args = JSON.parse(argsText);
			}
		} catch {
			// Keep empty args
		}

		toolCalls.push({
			id: `qwen_call_${toolCallId++}`,
			name: functionName,
			arguments: args,
		});
	}

	return toolCalls;
}

/**
 * Parse GLM function call format
 * GLM models may output tool calls in various ways
 */
export function parseGLMToolCalls(content: string): NormalizedToolCall[] {
	// GLM often uses a JSON-based format similar to OpenAI
	// Try to find JSON function calls in content
	const toolCalls: NormalizedToolCall[] = [];

	// Look for action/parameters pattern that MiniMax example showed
	const actionRegex = /"action":\s*"([^"]+)"[\s\S]*?"parameters":\s*(\{[^}]*\})/g;

	let toolCallId = 0;

	for (const match of content.matchAll(actionRegex)) {
		try {
			const args = JSON.parse(match[2]);
			toolCalls.push({
				id: `glm_call_${toolCallId++}`,
				name: match[1],
				arguments: args,
			});
		} catch {
			// Skip malformed
		}
	}

	// Also check for standard tool call JSON in content
	if (toolCalls.length === 0) {
		const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?"(?:name|function)"[\s\S]*?\})\s*```/g;
		for (const match of content.matchAll(jsonBlockRegex)) {
			try {
				const parsed = JSON.parse(match[1]);
				if (parsed.name || parsed.function) {
					toolCalls.push({
						id: `glm_call_${toolCallId++}`,
						name: parsed.name || parsed.function,
						arguments: parsed.arguments || parsed.parameters || {},
					});
				}
			} catch {
				// Skip
			}
		}
	}

	return toolCalls;
}

/**
 * Convert parameter value based on expected type
 */
function convertParamValue(value: string, paramType: string): unknown {
	if (value.toLowerCase() === "null") return null;

	const type = paramType.toLowerCase();

	switch (type) {
		case "string":
		case "str":
		case "text":
			return value;

		case "integer":
		case "int":
			try {
				return parseInt(value, 10);
			} catch {
				return value;
			}

		case "number":
		case "float":
			try {
				const num = parseFloat(value);
				return Number.isInteger(num) ? Math.floor(num) : num;
			} catch {
				return value;
			}

		case "boolean":
		case "bool":
			return value.toLowerCase() === "true" || value === "1";

		case "object":
		case "array":
			try {
				return JSON.parse(value);
			} catch {
				return value;
			}

		default:
			// Try JSON parse, fall back to string
			try {
				return JSON.parse(value);
			} catch {
				return value;
			}
	}
}

/**
 * Main parser function - detects format and parses accordingly
 */
export function parseToolCalls(
	content: string,
	modelId: string,
	tools?: OpenAiTool[]
): NormalizedToolCall[] {
	// First try auto-detection from content
	const detectedFormat = detectFormatFromContent(content);

	// If not detected from content, use model-based detection
	const format = detectedFormat !== "openai" ? detectedFormat : detectToolFormat(modelId);

	switch (format) {
		case "minimax":
			return parseMiniMaxToolCalls(content, tools);
		case "hermes":
			return parseHermesToolCalls(content);
		case "anthropic":
			return parseAnthropicToolCalls(content);
		case "qwen":
			return parseQwenToolCalls(content);
		case "glm":
			return parseGLMToolCalls(content);
		default:
			// OpenAI format is handled by the SDK, not content parsing
			return [];
	}
}

/**
 * Check if content contains any tool call markers
 */
export function hasToolCallMarkers(content: string): boolean {
	return (
		content.includes("<minimax:tool_call>") ||
		content.includes("<tool_call>") ||
		content.includes("<tool_use>") ||
		content.includes("✿FUNCTION✿") ||
		(content.includes('"action"') && content.includes('"parameters"'))
	);
}

/**
 * Get tool format description for model prompts
 */
export function getToolFormatDescription(modelId: string): string {
	const format = detectToolFormat(modelId);

	switch (format) {
		case "minimax":
			return `When calling tools, use the MiniMax XML format:
<minimax:tool_call>
<invoke name="tool_name">
<parameter name="param_name">param_value</parameter>
</invoke>
</minimax:tool_call>`;

		case "hermes":
			return `When calling tools, use JSON format inside tool_call tags:
<tool_call>
{"name": "tool_name", "arguments": {"param": "value"}}
</tool_call>`;

		case "anthropic":
			return `When calling tools, use the tool_use format:
<tool_use>
<tool_name>tool_name</tool_name>
<parameters>{"param": "value"}</parameters>
</tool_use>`;

		case "qwen":
			return `When calling tools, use the Qwen function format:
✿FUNCTION✿: tool_name
✿ARGS✿: {"param": "value"}`;

		default:
			return ""; // OpenAI format is handled natively
	}
}

/**
 * Configuration for tool formats per model
 */
export interface ToolFormatConfig {
	format: ToolFormat;
	supportsParallelCalls: boolean;
	supportsStreaming: boolean;
	requiresSpecialPrompt: boolean;
	promptTemplate?: string;
}

/**
 * Get detailed tool format configuration for a model
 */
export function getToolFormatConfig(modelId: string): ToolFormatConfig {
	const format = detectToolFormat(modelId);

	const configs: Record<ToolFormat, ToolFormatConfig> = {
		openai: {
			format: "openai",
			supportsParallelCalls: true,
			supportsStreaming: true,
			requiresSpecialPrompt: false,
		},
		minimax: {
			format: "minimax",
			supportsParallelCalls: true,
			supportsStreaming: true,
			requiresSpecialPrompt: false, // MiniMax handles this internally
		},
		hermes: {
			format: "hermes",
			supportsParallelCalls: true,
			supportsStreaming: true,
			requiresSpecialPrompt: true,
			promptTemplate: getToolFormatDescription("hermes"),
		},
		anthropic: {
			format: "anthropic",
			supportsParallelCalls: true,
			supportsStreaming: true,
			requiresSpecialPrompt: false,
		},
		qwen: {
			format: "qwen",
			supportsParallelCalls: false,
			supportsStreaming: true,
			requiresSpecialPrompt: true,
			promptTemplate: getToolFormatDescription("qwen"),
		},
		glm: {
			format: "glm",
			supportsParallelCalls: true,
			supportsStreaming: true,
			requiresSpecialPrompt: false,
		},
		deepseek: {
			format: "openai",
			supportsParallelCalls: true,
			supportsStreaming: true,
			requiresSpecialPrompt: false,
		},
		auto: {
			format: "auto",
			supportsParallelCalls: true,
			supportsStreaming: true,
			requiresSpecialPrompt: false,
		},
	};

	return configs[format] || configs.openai;
}
