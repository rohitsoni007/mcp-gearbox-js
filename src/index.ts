import { exec, ExecOptions } from 'child_process';
import { spawn } from 'cross-spawn';
import which from 'which';

export interface ExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface McpCliOptions extends ExecOptions {
  stdio?: 'inherit' | 'pipe' | 'ignore';
}

/**
 * Check if running in Electron environment
 * @returns boolean indicating if running in Electron
 */
function isElectron(): boolean {
  return typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.electron != null;
}

/**
 * Execute mcp-cli command with given arguments
 * @param args - Command line arguments (string or string array)
 * @param options - Exec options
 * @returns Promise resolving to execution result
 */
export async function executeMcpCli(
  args: string | string[] = [],
  options: McpCliOptions = {}
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    let command: string | null = null;

    // Convert string to array if needed
    const argsArray = typeof args === 'string' ? args.split(' ').filter(arg => arg.trim() !== '') : args;

    // First try to find mcp-cli executable (installed via uv or pip)
    try {
      command = which.sync('mcp-cli');
    } catch (e) {
      // Fallback to python -m approach
      const pythonCommands = ['python3', 'python', 'py'];

      for (const cmd of pythonCommands) {
        try {
          command = which.sync(cmd);
          argsArray.unshift('-m', 'mcp_cli');
          break;
        } catch (e) {
          // Continue to next command
        }
      }
    }

    if (!command) {
      return reject(new Error('mcp-cli not found. Please install it using: node scripts/install.js'));
    }

    // Use exec for Electron, spawn for other environments
    if (isElectron()) {
      // Use exec for Electron
      const fullCommand = `${command} ${argsArray.join(' ')}`;
      exec(fullCommand, options, (error, stdout, stderr) => {
        if (error) {
          resolve({ code: error.code || 1, stdout: stdout.toString(), stderr: stderr.toString() });
        } else {
          resolve({ code: 0, stdout: stdout.toString(), stderr: stderr.toString() });
        }
      });
    } else {
      // Use cross-spawn for other environments
      const child = spawn(command, argsArray, {
        stdio: options.stdio || 'pipe',
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
    }
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