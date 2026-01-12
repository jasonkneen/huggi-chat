#!/usr/bin/env node

/**
 * Generate system prompt addendums for all models from HuggingFace Router
 * Each model gets a markdown file with appropriate instructions based on its capabilities
 */

import fs from 'fs';
import path from 'path';

const MODELS_JSON = '/tmp/hf_models_full.json';
const OUTPUT_DIR = path.join(process.cwd(), 'src/lib/server/model-prompts');

/**
 * Tool call format detection patterns
 * Maps model ID patterns to their tool call output format
 */
const TOOL_FORMAT_PATTERNS = [
  { pattern: /^MiniMaxAI\//i, format: 'minimax' },
  { pattern: /minimax/i, format: 'minimax' },
  { pattern: /hermes/i, format: 'hermes' },
  { pattern: /NousResearch\/Hermes/i, format: 'hermes' },
  { pattern: /zai-org\/GLM/i, format: 'glm' },
  { pattern: /zai-org\/AutoGLM/i, format: 'glm' },
];

/**
 * Tool format documentation for non-OpenAI formats
 */
const TOOL_FORMAT_DOCS = {
  minimax: `
## Tool Calling Format

This model uses MiniMax's XML-based tool call format:

\`\`\`xml
<minimax:tool_call>
<invoke name="tool_name">
<parameter name="param1">value1</parameter>
<parameter name="param2">value2</parameter>
</invoke>
</minimax:tool_call>
\`\`\`

**Key points:**
- Use XML tags, not JSON, for tool invocations
- Parameter values are placed between opening and closing tags
- Multiple tool calls can be made in sequence
- The system will automatically parse this format
`,
  hermes: `
## Tool Calling Format

This model uses JSON format inside tool_call tags:

\`\`\`xml
<tool_call>
{"name": "tool_name", "arguments": {"param1": "value1"}}
</tool_call>
\`\`\`

**Key points:**
- Wrap JSON tool calls in <tool_call> tags
- Arguments should be a JSON object
- Multiple tool calls use separate tag blocks
`,
  glm: `
## Tool Calling Format

GLM models support function calling through structured JSON output.
When calling tools, output the function name and parameters as JSON.

**Key points:**
- Use standard OpenAI-compatible tool call format when available
- Some endpoints may require JSON in content for tool calls
`
};

function detectToolFormat(modelId) {
  for (const { pattern, format } of TOOL_FORMAT_PATTERNS) {
    if (pattern.test(modelId)) {
      return format;
    }
  }
  return 'openai'; // Default
}

// Model family patterns and their characteristics
const MODEL_FAMILIES = {
  // DeepSeek models
  'deepseek-ai/DeepSeek-R1': {
    type: 'reasoning',
    traits: ['chain-of-thought', 'mathematical', 'logical'],
    description: 'Advanced reasoning model with extended thinking capabilities'
  },
  'deepseek-ai/DeepSeek-V3': {
    type: 'general',
    traits: ['multilingual', 'coding', 'reasoning'],
    description: 'Powerful general-purpose model with strong coding and reasoning'
  },
  'deepseek-ai/DeepSeek-Prover': {
    type: 'math',
    traits: ['theorem-proving', 'mathematical', 'formal-verification'],
    description: 'Specialized for mathematical theorem proving'
  },

  // Qwen models
  'Qwen/Qwen3-Coder': {
    type: 'coding',
    traits: ['code-generation', 'debugging', 'multi-language'],
    description: 'Specialized for code generation and programming tasks'
  },
  'Qwen/Qwen3-VL': {
    type: 'vision',
    traits: ['image-understanding', 'visual-reasoning', 'multimodal'],
    description: 'Vision-language model for image understanding'
  },
  'Qwen/Qwen2.5-VL': {
    type: 'vision',
    traits: ['image-understanding', 'visual-reasoning', 'multimodal'],
    description: 'Vision-language model for image understanding'
  },
  'Qwen/Qwen2.5-Coder': {
    type: 'coding',
    traits: ['code-generation', 'debugging', 'multi-language'],
    description: 'Specialized for code generation'
  },
  'Qwen/QwQ': {
    type: 'reasoning',
    traits: ['chain-of-thought', 'mathematical', 'step-by-step'],
    description: 'Reasoning-focused model with extended thinking'
  },

  // Meta Llama
  'meta-llama/Llama-3': {
    type: 'general',
    traits: ['instruction-following', 'multilingual', 'versatile'],
    description: 'General-purpose instruction-following model'
  },

  // Google Gemma
  'google/gemma': {
    type: 'general',
    traits: ['lightweight', 'efficient', 'instruction-following'],
    description: 'Efficient instruction-following model'
  },

  // Cohere
  'CohereLabs/c4ai-command': {
    type: 'general',
    traits: ['enterprise', 'tool-use', 'multilingual'],
    description: 'Enterprise-grade command model with tool use'
  },
  'CohereLabs/aya': {
    type: 'multilingual',
    traits: ['multilingual', '100+ languages', 'inclusive'],
    description: 'Massively multilingual model supporting 100+ languages'
  },
  'CohereLabs/command-a-reasoning': {
    type: 'reasoning',
    traits: ['chain-of-thought', 'analytical', 'step-by-step'],
    description: 'Reasoning-focused command model'
  },
  'CohereLabs/command-a-translate': {
    type: 'translation',
    traits: ['translation', 'multilingual', 'cross-lingual'],
    description: 'Specialized for translation tasks'
  },
  'CohereLabs/command-a-vision': {
    type: 'vision',
    traits: ['image-understanding', 'visual-reasoning', 'multimodal'],
    description: 'Vision-enabled command model'
  },

  // GLM models
  'zai-org/GLM': {
    type: 'general',
    traits: ['multilingual', 'chinese', 'instruction-following'],
    description: 'General Language Model with strong Chinese capabilities'
  },
  'zai-org/GLM-4.5V': {
    type: 'vision',
    traits: ['image-understanding', 'visual-reasoning', 'multimodal'],
    description: 'Vision-enabled GLM model'
  },
  'zai-org/GLM-4.6V': {
    type: 'vision',
    traits: ['image-understanding', 'visual-reasoning', 'multimodal'],
    description: 'Vision-enabled GLM model'
  },
  'zai-org/AutoGLM': {
    type: 'agent',
    traits: ['phone-control', 'gui-agent', 'automation'],
    description: 'Specialized for phone/GUI automation'
  },

  // MiniMax
  'MiniMaxAI/MiniMax': {
    type: 'general',
    traits: ['long-context', 'efficient', 'versatile'],
    description: 'Long-context capable model'
  },

  // NVIDIA
  'nvidia/': {
    type: 'general',
    traits: ['optimized', 'enterprise', 'efficient'],
    description: 'NVIDIA-optimized model for enterprise use'
  },

  // Hermes
  'NousResearch/Hermes': {
    type: 'general',
    traits: ['instruction-following', 'creative', 'versatile'],
    description: 'Versatile instruction-following model'
  },

  // Specialized
  'deepcogito/cogito': {
    type: 'reasoning',
    traits: ['cognitive', 'reasoning', 'analytical'],
    description: 'Cognitive reasoning model'
  },
  'moonshotai/Kimi': {
    type: 'general',
    traits: ['long-context', 'chinese', 'multilingual'],
    description: 'Long-context model with strong Chinese support'
  },
  'moonshotai/Kimi-K2-Thinking': {
    type: 'reasoning',
    traits: ['chain-of-thought', 'extended-thinking', 'analytical'],
    description: 'Reasoning-focused Kimi model'
  },

  // Baidu ERNIE
  'baidu/ERNIE': {
    type: 'general',
    traits: ['chinese', 'multilingual', 'knowledge-enhanced'],
    description: 'Knowledge-enhanced model with strong Chinese capabilities'
  },
  'baidu/ERNIE-4.5-VL': {
    type: 'vision',
    traits: ['image-understanding', 'chinese', 'multimodal'],
    description: 'Vision-language ERNIE model'
  },

  // OpenAI OSS
  'openai/gpt-oss': {
    type: 'general',
    traits: ['open-source', 'instruction-following', 'versatile'],
    description: 'Open-source GPT model'
  },
  'openai/gpt-oss-safeguard': {
    type: 'safety',
    traits: ['content-moderation', 'safety', 'filtering'],
    description: 'Safety and content moderation model'
  },

  // Research/specialized
  'allenai/Olmo': {
    type: 'general',
    traits: ['open-research', 'transparent', 'research-focused'],
    description: 'Open research model from AI2'
  },
  'alpindale/WizardLM': {
    type: 'general',
    traits: ['instruction-following', 'complex-tasks', 'versatile'],
    description: 'Enhanced instruction-following model'
  },
  'ServiceNow-AI/Apriel': {
    type: 'reasoning',
    traits: ['thinking', 'analytical', 'enterprise'],
    description: 'Enterprise reasoning model'
  },
  'dicta-il/DictaLM': {
    type: 'reasoning',
    traits: ['hebrew', 'thinking', 'multilingual'],
    description: 'Hebrew-focused reasoning model'
  },
  'XiaomiMiMo/MiMo': {
    type: 'general',
    traits: ['efficient', 'mobile-optimized', 'chinese'],
    description: 'Efficient model optimized for mobile'
  },
  'EssentialAI/rnj': {
    type: 'general',
    traits: ['instruction-following', 'efficient'],
    description: 'Essential AI instruction model'
  },
  'PrimeIntellect/INTELLECT': {
    type: 'general',
    traits: ['decentralized', 'collaborative', 'open'],
    description: 'Decentralized collaborative model'
  },
  'swiss-ai/Apertus': {
    type: 'general',
    traits: ['swiss', 'multilingual', 'european'],
    description: 'Swiss AI multilingual model'
  },
  'utter-project/EuroLLM': {
    type: 'multilingual',
    traits: ['european-languages', 'multilingual', 'translation'],
    description: 'European language focused model'
  },
  'tokyotech-llm/': {
    type: 'general',
    traits: ['japanese', 'multilingual', 'research'],
    description: 'Japanese-focused research model'
  },
  'aisingapore/': {
    type: 'multilingual',
    traits: ['southeast-asian', 'multilingual', 'regional'],
    description: 'Southeast Asian multilingual model'
  },
  'baichuan-inc/': {
    type: 'general',
    traits: ['chinese', 'multilingual', 'efficient'],
    description: 'Chinese-focused efficient model'
  },
  'Sao10K/': {
    type: 'creative',
    traits: ['roleplay', 'creative-writing', 'storytelling'],
    description: 'Creative writing and roleplay model'
  },
  'marin-community/': {
    type: 'general',
    traits: ['community', 'open', 'collaborative'],
    description: 'Community-developed open model'
  },
  'katanemo/Arch-Router': {
    type: 'routing',
    traits: ['model-routing', 'classification', 'meta'],
    description: 'Model routing and classification'
  },
  'HuggingFaceTB/SmolLM': {
    type: 'general',
    traits: ['small', 'efficient', 'edge-deployment'],
    description: 'Small and efficient model for edge deployment'
  }
};

// Template generators based on model type
const PROMPT_TEMPLATES = {
  reasoning: (model, traits) => `# ${model.displayName || model.id}

## Model Characteristics
This is an advanced reasoning model optimized for complex analytical tasks.

## Behavior Guidelines

### Thinking Process
- Use step-by-step reasoning for complex problems
- Show your work when solving mathematical or logical problems
- Break down complex questions into manageable parts
- Verify conclusions before presenting final answers

### Response Style
- Be thorough but concise
- Structure responses clearly with headers when appropriate
- Acknowledge uncertainty when present
- Provide reasoning chains that users can follow

### Best Use Cases
- Mathematical problem solving
- Logical analysis and puzzles
- Code debugging and algorithm design
- Complex decision analysis
- Scientific reasoning

${traits.includes('mathematical') ? `
### Mathematical Tasks
- Show step-by-step solutions
- Verify calculations
- Consider edge cases
- Explain reasoning behind each step
` : ''}
`,

  vision: (model, traits) => `# ${model.displayName || model.id}

## Model Characteristics
This is a vision-language model capable of understanding and analyzing images.

## Behavior Guidelines

### Image Analysis
- Describe images accurately and comprehensively
- Note relevant details, colors, objects, and context
- Identify text within images when present
- Recognize charts, diagrams, and structured content

### Response Style
- Start with a high-level description before details
- Be specific about spatial relationships
- Note any unclear or ambiguous elements
- Combine visual analysis with contextual understanding

### Best Use Cases
- Image description and captioning
- Visual question answering
- Document and chart analysis
- Object recognition and counting
- Visual reasoning tasks

### Limitations
- Cannot generate images, only analyze them
- May have difficulty with low-quality or highly stylized images
- OCR capabilities vary by image quality
`,

  coding: (model, traits) => `# ${model.displayName || model.id}

## Model Characteristics
This model is specialized for code generation and programming tasks.

## Behavior Guidelines

### Code Quality
- Write clean, readable, and well-documented code
- Follow language-specific conventions and best practices
- Include appropriate error handling
- Consider edge cases in implementations

### Response Format
- Use appropriate code blocks with language tags
- Explain complex logic with comments
- Provide usage examples when helpful
- Structure larger solutions into logical components

### Best Practices
- Prefer simple solutions over complex ones
- Consider security implications
- Optimize for readability first, performance when needed
- Test edge cases mentally before presenting solutions

### Supported Languages
This model supports multiple programming languages including:
- Python, JavaScript/TypeScript, Java, C/C++
- Go, Rust, Ruby, PHP, Swift, Kotlin
- SQL, HTML/CSS, Shell scripting
- And many others
`,

  multilingual: (model, traits) => `# ${model.displayName || model.id}

## Model Characteristics
This is a multilingual model with broad language support.

## Behavior Guidelines

### Language Handling
- Respond in the same language as the user's query by default
- Handle code-switching and mixed-language inputs gracefully
- Maintain cultural sensitivity across languages
- Preserve meaning and nuance in translations

### Response Style
- Adapt formality level to cultural norms
- Use appropriate scripts and character sets
- Consider regional variations in language

### Capabilities
${traits.includes('100+ languages') ? '- Supports over 100 languages' : '- Supports multiple languages'}
- Cross-lingual understanding and generation
- Translation assistance
- Multilingual content creation
`,

  translation: (model, traits) => `# ${model.displayName || model.id}

## Model Characteristics
This model is optimized for translation tasks.

## Behavior Guidelines

### Translation Quality
- Preserve meaning, tone, and intent
- Handle idiomatic expressions appropriately
- Maintain formatting and structure
- Consider context for ambiguous terms

### Response Format
- Provide clean translations without excessive explanation
- Note significant cultural adaptations when made
- Offer alternatives for ambiguous phrases when relevant

### Best Practices
- Ask for clarification on ambiguous source text
- Preserve technical terminology appropriately
- Adapt formality levels between languages
`,

  safety: (model, traits) => `# ${model.displayName || model.id}

## Model Characteristics
This model is designed for content safety and moderation tasks.

## Behavior Guidelines

### Safety Focus
- Identify potentially harmful content accurately
- Provide clear categorization of content types
- Explain safety concerns when relevant
- Balance safety with avoiding over-censorship

### Response Format
- Be clear and direct about safety assessments
- Provide actionable recommendations
- Distinguish severity levels appropriately
`,

  agent: (model, traits) => `# ${model.displayName || model.id}

## Model Characteristics
This model is specialized for agentic and automation tasks.

## Behavior Guidelines

### Task Execution
- Break down complex tasks into clear steps
- Verify understanding before execution
- Report progress and completion status
- Handle errors gracefully

### Interaction Style
- Be precise about actions taken
- Confirm before irreversible operations
- Provide clear success/failure feedback
`,

  routing: (model, traits) => `# ${model.displayName || model.id}

## Model Characteristics
This model is specialized for routing and classification tasks.

## Behavior Guidelines

### Classification
- Provide clear categorization with confidence levels
- Handle edge cases appropriately
- Explain routing decisions when helpful
`,

  creative: (model, traits) => `# ${model.displayName || model.id}

## Model Characteristics
This model excels at creative writing and storytelling tasks.

## Behavior Guidelines

### Creative Output
- Embrace creativity while maintaining coherence
- Develop engaging narratives and characters
- Adapt style to user preferences
- Balance creativity with user guidance

### Interaction Style
- Be responsive to creative direction
- Offer alternatives and variations
- Maintain consistency within established contexts
`,

  math: (model, traits) => `# ${model.displayName || model.id}

## Model Characteristics
This model is specialized for mathematical reasoning and theorem proving.

## Behavior Guidelines

### Mathematical Rigor
- Provide formal, step-by-step proofs
- Use proper mathematical notation
- Verify logical consistency
- Consider edge cases and counterexamples

### Response Format
- Structure proofs clearly
- Define terms and notation used
- Cite relevant theorems and lemmas
`,

  general: (model, traits) => `# ${model.displayName || model.id}

## Model Characteristics
This is a general-purpose assistant model.

## Behavior Guidelines

### Response Quality
- Provide accurate, helpful information
- Be clear and well-organized
- Acknowledge limitations and uncertainties
- Adapt to user needs and preferences

### Interaction Style
- Be conversational yet professional
- Ask clarifying questions when needed
- Provide examples to illustrate points
- Structure complex responses appropriately

### Capabilities
- General knowledge and reasoning
- Writing and editing assistance
- Code and technical help
- Creative and analytical tasks
${traits.length ? '\n### Strengths\n' + traits.map(t => `- ${t.replace(/-/g, ' ')}`).join('\n') : ''}
`
};

function getModelFamily(modelId) {
  // Check for exact or prefix matches
  for (const [pattern, config] of Object.entries(MODEL_FAMILIES)) {
    if (modelId.startsWith(pattern) || modelId.includes(pattern.split('/')[1])) {
      return config;
    }
  }

  // Infer from model name patterns
  const lowerName = modelId.toLowerCase();

  if (lowerName.includes('vl') || lowerName.includes('vision')) {
    return { type: 'vision', traits: ['multimodal'], description: 'Vision-language model' };
  }
  if (lowerName.includes('coder') || lowerName.includes('code')) {
    return { type: 'coding', traits: ['code-generation'], description: 'Code-focused model' };
  }
  if (lowerName.includes('think') || lowerName.includes('reason') || lowerName.includes('r1')) {
    return { type: 'reasoning', traits: ['chain-of-thought'], description: 'Reasoning model' };
  }
  if (lowerName.includes('translate')) {
    return { type: 'translation', traits: ['translation'], description: 'Translation model' };
  }

  return { type: 'general', traits: [], description: 'General-purpose model' };
}

function sanitizeFilename(modelId) {
  return modelId.replace(/\//g, '--').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

async function generatePrompts() {
  // Read model data
  const rawData = fs.readFileSync(MODELS_JSON, 'utf-8');
  const modelsData = JSON.parse(rawData);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate prompt for each model
  for (const model of modelsData.data) {
    const family = getModelFamily(model.id);
    const template = PROMPT_TEMPLATES[family.type] || PROMPT_TEMPLATES.general;

    // Check for vision capability from architecture
    const inputModalities = model.architecture?.input_modalities || [];
    const isVision = inputModalities.includes('image') || inputModalities.includes('vision');

    // Check for tool support
    const supportsTools = (model.providers || []).some(p => p.supports_tools);

    // Build enhanced model info
    const enhancedModel = {
      ...model,
      displayName: model.id.split('/')[1] || model.id
    };

    // Generate prompt content
    let content = template(enhancedModel, family.traits);

    // Add vision section if model supports images but isn't primarily a vision model
    if (isVision && family.type !== 'vision') {
      content += `
## Vision Capabilities
This model can process and understand images in addition to text.
- Describe and analyze images
- Answer questions about visual content
- Extract information from documents and charts
`;
    }

    // Add tool use section if supported
    if (supportsTools) {
      content += `
## Tool Use
This model supports function calling and tool use.
- Can invoke external functions when appropriate
- Follows structured output formats for tool calls
- Handles multi-step tool interactions
`;

      // Add model-specific tool format documentation if non-OpenAI
      const toolFormat = detectToolFormat(model.id);
      if (toolFormat !== 'openai' && TOOL_FORMAT_DOCS[toolFormat]) {
        content += TOOL_FORMAT_DOCS[toolFormat];
      }
    }

    // Add context length if available
    const maxContext = Math.max(...(model.providers || []).map(p => p.context_length || 0));
    if (maxContext > 0) {
      content += `
## Context Length
Maximum context: ${maxContext.toLocaleString()} tokens
`;
    }

    // Write the file
    const filename = sanitizeFilename(model.id) + '.md';
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, content);

    console.log(`Generated: ${filename}`);
  }

  // Create an index file
  const indexContent = `# Model Prompt Index

Generated: ${new Date().toISOString()}

## Models (${modelsData.data.length} total)

${modelsData.data.map(m => {
  const family = getModelFamily(m.id);
  return `- [${m.id}](./${sanitizeFilename(m.id)}.md) - ${family.type}`;
}).join('\n')}
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'INDEX.md'), indexContent);
  console.log(`\nGenerated INDEX.md with ${modelsData.data.length} models`);
}

generatePrompts().catch(console.error);
