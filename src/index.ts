import { spawn } from 'cross-spawn';
import which from 'which';
import { SpawnOptions } from 'child_process';

export interface ExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface McpCliOptions extends SpawnOptions {
  stdio?: 'inherit' | 'pipe' | 'ignore';
}

/**
 * Execute mcp-cli command with given arguments
 * @param args - Command line arguments
 * @param options - Spawn options
 * @returns Promise resolving to execution result
 */
export async function executeMcpCli(
  args: string[] = [],
  options: McpCliOptions = {}
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    let command: string | null = null;
    let commandArgs = args;

    // First try to find mcp-cli executable (installed via uv or pip)
    try {
      command = which.sync('mcp-cli');
    } catch (e) {
      // Fallback to python -m approach
      const pythonCommands = ['python3', 'python', 'py'];

      for (const cmd of pythonCommands) {
        try {
          command = which.sync(cmd);
          commandArgs = ['-m', 'mcp_cli', ...args];
          break;
        } catch (e) {
          // Continue to next command
        }
      }
    }

    if (!command) {
      return reject(new Error('mcp-cli not found. Please install it using: node scripts/install.js'));
    }

    // Execute the command
    const child = spawn(command, commandArgs, {
      stdio: options.stdio || 'inherit',
      ...options
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code: number | null) => {
      resolve({ code: code || 0, stdout, stderr });
    });

    child.on('error', (error: Error) => {
      reject(error);
    });
  });
}

/**
 * Check if mcp-cli is installed
 * @returns Promise resolving to installation status
 */
export async function isMcpCliInstalled(): Promise<boolean> {
  try {
    const result = await executeMcpCli(['--version'], { stdio: 'pipe' });
    return result.code === 0;
  } catch (e) {
    return false;
  }
}