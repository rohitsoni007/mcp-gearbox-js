#!/usr/bin/env node

const { spawn } = require("cross-spawn");
const which = require("which");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  CONFIG_BASE_DIR,
  CONFIG_FILE_NAME,
  UV_INSTALL_ARGS,
  PYTHON_INSTALL_ARGS,
} = require("../dist/utils/constants.json");

console.log("Installing mcp-cli Python package...");

// Function to save installation priority to config file
function savePriorityConfig(method, executablePath) {
  const configDir = path.join(os.homedir(), CONFIG_BASE_DIR);
  const configPath = path.join(configDir, CONFIG_FILE_NAME);
  const config = {
    installMethod: method,
    executablePath: executablePath,
    installedAt: new Date().toISOString(),
  };

  try {
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Priority config saved to ${configPath}`);
  } catch (error) {
    console.warn(`⚠️  Could not save config file: ${error.message}`);
  }
}

async function installMcpCli() {
  // Check for uv first (recommended)
  try {
    const uvPath = which.sync("uv");
    console.log("Found uv, installing with uv tool...");

    const uvInstallResult = await new Promise((resolve) => {
      const uvProcess = spawn(uvPath, UV_INSTALL_ARGS, { stdio: "inherit" });

      uvProcess.on("close", (code) => {
        if (code === 0) {
          console.log("✅ mcp-cli installed successfully with uv!");
          // Determine the uv executable path
          const homeDir = process.env.HOME || process.env.USERPROFILE;
          const pathSep = process.platform === "win32" ? "\\" : "/";
          const uvMcpCli = `${homeDir}${pathSep}.local${pathSep}bin${pathSep}mcp-cli${
            process.platform === "win32" ? ".exe" : ""
          }`;
          savePriorityConfig("uv", uvMcpCli);
          resolve(true);
        } else {
          console.log("⚠️  uv installation failed, trying pip...");
          resolve(false); // Continue to pip fallback
        }
      });
      uvProcess.on("error", () => {
        console.log("⚠️  uv installation failed, trying pip...");
        resolve(false); // Continue to pip fallback
      });
    });

    if (uvInstallResult) {
      return; // Successfully installed with uv
    }
  } catch (e) {
    console.log("uv not found, trying pip...");
  }

  // Fallback to pip
  const pythonCommands = ["python3", "python", "py"];
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
    console.error(
      "❌ Python not found. Please install Python 3.11+ and try again."
    );
    console.error("   Visit: https://www.python.org/downloads/");
    process.exit(1);
  }

  console.log(`Found Python at: ${pythonPath}`);
  console.log("Installing mcp-cli with pip...");

  return new Promise((resolve, reject) => {
    const pipProcess = spawn(pythonPath, PYTHON_INSTALL_ARGS, {
      stdio: "inherit",
    });

    pipProcess.on("close", (code) => {
      if (code === 0) {
        console.log("✅ mcp-cli installed successfully with pip!");
        savePriorityConfig("pip", `${pythonPath} -m mcp_cli`);
        resolve();
      } else {
        console.error("❌ Failed to install mcp-cli with pip.");
        console.error("   Please install manually:");
        console.error(
          "   pip install git+https://github.com/rohitsoni007/mcp-gearbox-cli"
        );
        reject(new Error("Installation failed"));
      }
    });
    pipProcess.on("error", (error) => {
      console.error("❌ Error during installation:", error.message);
      reject(error);
    });
  });
}

// Only run installation if this script is executed directly
if (require.main === module) {
  installMcpCli().catch((error) => {
    console.error("Installation failed:", error.message);
    process.exit(1);
  });
}

module.exports = { installMcpCli };
