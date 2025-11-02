const { spawn } = require('cross-spawn');
const which = require('which');
const path = require('path');

/**
 * Execute mcp-cli command with given arguments
 * @param {string[]} args - Command line arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
async function executeMcpCli(args = [], options = {}) {
  return new Promise((resolve, reject) => {
    let command = null;
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
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Check if mcp-cli is installed
 * @returns {Promise<boolean>}
 */
async function isMcpCliInstalled() {
  try {
    const result = await executeMcpCli(['--version'], { stdio: 'pipe' });
    return result.code === 0;
  } catch (e) {
    return false;
  }
}

module.exports = {
  executeMcpCli,
  isMcpCliInstalled
};