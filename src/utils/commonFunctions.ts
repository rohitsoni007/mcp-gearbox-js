import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CONFIG_BASE_DIR, CONFIG_FILE_NAME } from "./constants.json";
import { PriorityConfig } from "./interfaces";

/**
 * Read priority configuration from ~/.mcpgearbox/config.json
 */
export function readPriorityConfig(): PriorityConfig | null {
  try {
    const configPath = path.join(
      os.homedir(),
      CONFIG_BASE_DIR,
      CONFIG_FILE_NAME
    );
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, "utf8");
      return JSON.parse(configData);
    }
  } catch (error) {
    // Ignore errors and fall back to discovery
  }
  return null;
}
