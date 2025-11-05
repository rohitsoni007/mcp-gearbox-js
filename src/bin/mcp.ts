#!/usr/bin/env node

import { executeMcpCli } from '../index';

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const result = await executeMcpCli(args, { stdio: 'inherit' });
    process.exit(result.code);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error executing mcp:', errorMessage);
    process.exit(1);
  }
}

main();