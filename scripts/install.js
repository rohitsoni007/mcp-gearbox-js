#!/usr/bin/env node

const { exec } = require('child_process');
const { spawn } = require('cross-spawn');
const which = require('which');

/**
 * Check if running in Electron environment
 * @returns boolean indicating if running in Electron
 */
function isElectron() {
  return typeof process !== 'undefined' && 
         process.versions != null && 
         process.versions.electron != null;
}

console.log('Installing mcp-cli Python package...');

async function installMcpCli() {
  // Check for uv first (recommended)
  try {
    const uvPath = which.sync('uv');
    console.log('Found uv, installing with uv tool...');
    
    return new Promise((resolve) => {
      if (isElectron()) {
        // Use exec for Electron
        const uvCommand = `${uvPath} tool install mcp-gearbox --force --from git+https://github.com/rohitsoni007/mcp-gearbox-cli`;
        exec(uvCommand, { stdio: 'inherit' }, (error) => {
          if (!error) {
            console.log('✅ mcp-cli installed successfully with uv!');
            resolve();
          } else {
            console.log('⚠️  uv installation failed, trying pip...');
            resolve(); // Continue to pip fallback
          }
        });
      } else {
        // Use cross-spawn for other environments
        const uvProcess = spawn(uvPath, [
          'tool', 'install', 'mcp-gearbox', '--force',
          '--from', 'git+https://github.com/rohitsoni007/mcp-gearbox-cli'
        ], { stdio: 'inherit' });

        uvProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ mcp-cli installed successfully with uv!');
            resolve();
          } else {
            console.log('⚠️  uv installation failed, trying pip...');
            resolve(); // Continue to pip fallback
          }
        });
        uvProcess.on('error', () => {
          console.log('⚠️  uv installation failed, trying pip...');
          resolve(); // Continue to pip fallback
        });
      }
    });
  } catch (e) {
    console.log('uv not found, trying pip...');
  }

  // Fallback to pip
  const pythonCommands = ['python3', 'python', 'py'];
  let pythonPath = null;

  for (const cmd of pythonCommands) {
    try {
      pythonPath = which.sync(cmd);
      break;
    } catch (e) {
      // Continue to next command
    }
  }

  if (!pythonPath) {
    console.error('❌ Python not found. Please install Python 3.11+ and try again.');
    console.error('   Visit: https://www.python.org/downloads/');
    process.exit(1);
  }

  console.log(`Found Python at: ${pythonPath}`);
  console.log('Installing mcp-cli with pip...');

  return new Promise((resolve, reject) => {
    if (isElectron()) {
      // Use exec for Electron
      const pipCommand = `${pythonPath} -m pip install git+https://github.com/rohitsoni007/mcp-gearbox-cli`;
      exec(pipCommand, { stdio: 'inherit' }, (error) => {
        if (!error) {
          console.log('✅ mcp-cli installed successfully with pip!');
          resolve();
        } else {
          console.error('❌ Failed to install mcp-cli with pip.');
          console.error('   Please install manually:');
          console.error('   pip install git+https://github.com/rohitsoni007/mcp-gearbox-cli');
          reject(new Error('Installation failed'));
        }
      });
    } else {
      // Use cross-spawn for other environments
      const pipProcess = spawn(pythonPath, [
        '-m', 'pip', 'install', 
        'git+https://github.com/rohitsoni007/mcp-gearbox-cli'
      ], { stdio: 'inherit' });

      pipProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ mcp-cli installed successfully with pip!');
          resolve();
        } else {
          console.error('❌ Failed to install mcp-cli with pip.');
          console.error('   Please install manually:');
          console.error('   pip install git+https://github.com/rohitsoni007/mcp-gearbox-cli');
          reject(new Error('Installation failed'));
        }
      });
      pipProcess.on('error', (error) => {
        console.error('❌ Error during installation:', error.message);
        reject(error);
      });
    }
  });
}

// Only run installation if this script is executed directly
if (require.main === module) {
  installMcpCli().catch((error) => {
    console.error('Installation failed:', error.message);
    process.exit(1);
  });
}

module.exports = { installMcpCli };