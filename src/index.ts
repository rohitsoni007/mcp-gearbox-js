import { spawn, sync as spawnSync } from 'cross-spawn';
import which from 'which';

export interface ExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface McpCliOptions {
  stdio?: 'inherit' | 'pipe' | 'ignore';
  cwd?: string;
  env?: NodeJS.ProcessEnv;
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
    let usePythonModule = false;

    // Convert string to array if needed
    const argsArray = typeof args === 'string' ? args.split(' ').filter(arg => arg.trim() !== '') : args;

    // Try python -m approach first to avoid conflicts with our own binaries
    const pythonCommands = ['python3', 'python', 'py'];

    for (const cmd of pythonCommands) {
      try {
        command = which.sync(cmd);
        // Test if mcp_cli module is available
        const testResult = spawnSync(command, ['-c', 'import mcp_cli'], { stdio: 'pipe' });
        if (testResult.status === 0) {
          argsArray.unshift('-m', 'mcp_cli');
          usePythonModule = true;
          break;
        }
      } catch (e) {
        // Continue to next command
      }
    }

    // If python module approach failed, try to find standalone mcp-cli executable
    if (!usePythonModule) {
      try {
        // Look for uv-installed version first
        const uvBinPath = process.env.HOME || process.env.USERPROFILE;
        if (uvBinPath) {
          const pathSep = process.platform === 'win32' ? '\\' : '/';
          const uvMcpCli = `${uvBinPath}${pathSep}.local${pathSep}bin${pathSep}mcp-cli${process.platform === 'win32' ? '.exe' : ''}`;
          try {
            // Test if this executable exists and works
            const testResult = spawnSync(uvMcpCli, ['--version'], { stdio: 'pipe' });
            if (testResult.status === 0) {
              command = uvMcpCli;
            }
          } catch (e) {
            // Continue to fallback
          }
        }

        // Fallback to system PATH (but this might find our own binary)
        if (!command) {
          const mcpCliPath = which.sync('mcp-cli');
          command = mcpCliPath;
        }
      } catch (e) {
        // No standalone executable found
      }
    }

    if (!command) {
      return reject(new Error('mcp-cli not found. Please install it using: node scripts/install.js'));
    }



    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      reject(new Error('Command timed out after 30 seconds'));
    }, 30000);

    const cleanup = () => {
      clearTimeout(timeout);
    };

    // Use cross-spawn for all environments
    const child = spawn(command, argsArray, {
      stdio: options.stdio || 'pipe',
      cwd: options.cwd,
      env: options.env
    });

    let stdout = '';
    let stderr = '';

    if (options.stdio === 'pipe') {
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
    }

    child.on('close', (code: number | null) => {
      cleanup();
      resolve({ code: code || 0, stdout, stderr });
    });

    child.on('error', (error: Error) => {
      cleanup();
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