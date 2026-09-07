/**
 * Ambient shape for the experimental WebMCP proposal (`document.modelContext`). The API is not
 * standardized yet and its exact registration return value varies by implementation, so the
 * adapter in `use-webmcp-tools.ts` feature-detects every call instead of assuming this shape is
 * final. See ADR 0008.
 */
export interface WebMcpToolResultContent {
  type: "text";
  text: string;
}

export interface WebMcpToolResult {
  content: WebMcpToolResultContent[];
  isError?: boolean;
}

export interface WebMcpToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<WebMcpToolResult>;
}

export interface WebMcpToolRegistration {
  remove?: () => void;
}

export interface ModelContext {
  registerTool: (descriptor: WebMcpToolDescriptor) => WebMcpToolRegistration | string | undefined;
  unregisterTool?: (nameOrId: string) => void;
}

declare global {
  interface Document {
    modelContext?: ModelContext | undefined;
  }
}

export function isWebMcpSupported(): boolean {
  return (
    typeof document !== "undefined" && typeof document.modelContext?.registerTool === "function"
  );
}

export function textResult(text: string): WebMcpToolResult {
  return { content: [{ type: "text", text }] };
}

export function errorResult(text: string): WebMcpToolResult {
  return { content: [{ type: "text", text }], isError: true };
}
