/**
 * TypeScript interfaces for mcp-gearbox
 */

export interface ExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface McpCliOptions {
  stdio?: "inherit" | "pipe" | "ignore";
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface PriorityConfig {
  installMethod: "uv" | "pip";
  executablePath: string;
  installedAt: string;
}
