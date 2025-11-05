import { spawn } from "cross-spawn";
import which from "which";
import * as fs from "fs";
import { readPriorityConfig } from "./utils/commonFunctions";
import { ExecutionResult, McpCliOptions } from "./utils/interfaces";

/**
 * Execute mcp-cli command with given arguments
 * Priority order: 1) Saved config from install, 2) uv-installed executable, 3) python -m mcp_cli, 4) system PATH
 * @param args - Command line arguments (string or string array)
 * @param options - Execution options
 * @returns Promise resolving to execution result
 */
export async function executeMcpCli(
  args: string | string[] = [],
  options: McpCliOptions = {}
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    let command: string | null = null;
    let commandArgs: string[] = [];

    // Convert string to array if needed
    const argsArray =
      typeof args === "string"
        ? args.split(" ").filter((arg) => arg.trim() !== "")
        : args;

    // First priority: Check saved configuration from install script
    const priorityConfig = readPriorityConfig();
    if (priorityConfig) {
      if (priorityConfig.installMethod === "uv") {
        command = priorityConfig.executablePath;
        commandArgs = argsArray;
      } else if (priorityConfig.installMethod === "pip") {
        // For pip installations, the path is "python -m mcp_cli"
        const pythonCmd = priorityConfig.executablePath.split(" ")[0];
        command = pythonCmd;
        commandArgs = ["-m", "mcp_cli", ...argsArray];
      }
    }

    // Fallback to discovery if saved config doesn't work
    if (!command) {
      // Second priority: Look for uv-installed version
      try {
        const uvBinPath = process.env.HOME || process.env.USERPROFILE;
        if (uvBinPath) {
          const pathSep = process.platform === "win32" ? "\\" : "/";
          const uvMcpCli = `${uvBinPath}${pathSep}.local${pathSep}bin${pathSep}mcp-cli${
            process.platform === "win32" ? ".exe" : ""
          }`;
          if (fs.existsSync(uvMcpCli)) {
            command = uvMcpCli;
            commandArgs = argsArray;
          }
        }
      } catch (e) {
        // Continue to next approach
      }

      // Third priority: Try python -m approach if uv version not found
      if (!command) {
        const pythonCommands = ["python3", "python", "py"];

        for (const cmd of pythonCommands) {
          try {
            const pythonPath = which.sync(cmd);
            command = pythonPath;
            commandArgs = ["-m", "mcp_cli", ...argsArray];
            break;
          } catch (e) {
            // Continue to next command
          }
        }
      }

      // Fourth priority: Fallback to system PATH (but this might find our own binary)
      if (!command) {
        try {
          const mcpCliPath = which.sync("mcp-cli");
          command = mcpCliPath;
          commandArgs = argsArray;
        } catch (e) {
          // No executable found
        }
      }
    }

    if (!command) {
      return reject(
        new Error(
          "mcp-cli not found. Please install it using: node scripts/install.js"
        )
      );
    }

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      reject(new Error("Command timed out after 30 seconds"));
    }, 30000);

    const cleanup = () => {
      clearTimeout(timeout);
    };

    // Use cross-spawn for all environments
    const child = spawn(command, commandArgs, {
      stdio: options.stdio || "pipe",
      cwd: options.cwd,
      env: options.env,
    });

    let stdout = "";
    let stderr = "";

    if (options.stdio === "pipe") {
      if (child.stdout) {
        child.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });
      }
    }

    child.on("close", (code: number | null) => {
      cleanup();
      resolve({ code: code || 0, stdout, stderr });
    });

    child.on("error", (error: Error) => {
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
    const result = await executeMcpCli(["--version"], { stdio: "pipe" });
    return result.code === 0;
  } catch (e) {
    return false;
  }
}
