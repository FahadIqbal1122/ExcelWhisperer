import { GoogleGenAI } from "@google/genai";

const genai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "default_key"
});

export interface CodeGenerationResult {
  code: string;
  confidence: 'high' | 'medium' | 'low';
  parameters: Array<{
    name: string;
    type: string;
    defaultValue: any;
    description?: string;
  }>;
  explanation: string;
}

export async function generatePandasCode(
  nlInstruction: string,
  columns: Array<{ name: string; type: string; index: number }>,
  preview: Array<Record<string, any>>
): Promise<CodeGenerationResult> {
  try {
    const columnInfo = columns.map(col => `${col.name} (${col.type})`).join(', ');
    const sampleData = preview.slice(0, 3).map(row => 
      Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(', ')
    ).join('\n');

    const prompt = `You are an expert data analyst. Generate Python pandas code to transform the given dataset based on the natural language instruction.

Dataset columns: ${columnInfo}
Sample data:
${sampleData}

Natural language instruction: "${nlInstruction}"

Requirements:
1. Generate clean, readable pandas code
2. Include comments explaining the transformation
3. Use a function named transform_data(df) that takes a DataFrame and returns the transformed DataFrame
4. Handle edge cases and data type conversions
5. Identify any parameters that could be made configurable
6. IMPORTANT: Always specify explicit values for pandas functions:
   - For fillna(), always use fillna(value="some_value") or fillna(method="ffill")
   - For dropna(), be explicit about parameters
   - Use proper pandas syntax that works with pandas 2.x

CRITICAL PANDAS RULES:
- df.fillna("unknown") instead of df.fillna()
- df.fillna(0) for numeric columns
- df.fillna(method="ffill") for forward fill
- Always return a valid DataFrame from transform_data()

Respond with JSON in this exact format:
{
  "code": "# Python pandas code here",
  "confidence": "high|medium|low",
  "parameters": [
    {
      "name": "parameter_name",
      "type": "string|number|date|boolean",
      "defaultValue": "value",
      "description": "optional description"
    }
  ],
  "explanation": "Brief explanation of what the code does"
}`;

    // Using Google's Gemini 2.5 Flash model (free tier available)
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: "You are a data transformation expert. Generate pandas code and respond only with valid JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            code: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            parameters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  defaultValue: {},
                  description: { type: "string" }
                },
                required: ["name", "type", "defaultValue"]
              }
            },
            explanation: { type: "string" }
          },
          required: ["code", "confidence", "parameters", "explanation"]
        }
      },
      contents: prompt,
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      code: result.code || "# Unable to generate code",
      confidence: result.confidence || 'low',
      parameters: result.parameters || [],
      explanation: result.explanation || "Code generation failed"
    };
  } catch (error) {
    console.error("Gemini code generation error:", error);
    return {
      code: "# Error generating code: " + (error as Error).message,
      confidence: 'low',
      parameters: [],
      explanation: "Failed to generate code due to an error"
    };
  }
}

export async function improveCode(
  originalCode: string,
  errorMessage: string,
  columns: Array<{ name: string; type: string; index: number }>
): Promise<CodeGenerationResult> {
  try {
    const prompt = `Fix the following pandas code that encountered an error:

Original code:
${originalCode}

Error message:
${errorMessage}

Available columns: ${columns.map(col => `${col.name} (${col.type})`).join(', ')}

CRITICAL PANDAS RULES TO FIX:
- For fillna(), always use fillna(value="some_value") or fillna(method="ffill")
- For dropna(), be explicit about parameters
- Use proper pandas syntax that works with pandas 2.x
- Always return a valid DataFrame from transform_data()

Generate a corrected version of the code. Respond with JSON in the same format as before.`;

    // Using Google's Gemini 2.5 Pro model for code fixing
    const response = await genai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: "You are a data transformation expert. Fix pandas code and respond only with valid JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            code: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            parameters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  defaultValue: {},
                  description: { type: "string" }
                },
                required: ["name", "type", "defaultValue"]
              }
            },
            explanation: { type: "string" }
          },
          required: ["code", "confidence", "parameters", "explanation"]
        }
      },
      contents: prompt,
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      code: result.code || "# Unable to fix code",
      confidence: result.confidence || 'low',
      parameters: result.parameters || [],
      explanation: result.explanation || "Code fix failed"
    };
  } catch (error) {
    console.error("Gemini code improvement error:", error);
    return {
      code: "# Error fixing code: " + (error as Error).message,
      confidence: 'low',
      parameters: [],
      explanation: "Failed to fix code due to an error"
    };
  }
}
