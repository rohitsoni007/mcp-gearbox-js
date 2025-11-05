const { executeMcpCli, isMcpCliInstalled } = require('../dist/index');

async function runTests() {
  console.log('Running Node.js wrapper tests...\n');

  try {
    // Test 1: Check if mcp-cli is installed
    console.log('Test 1: Checking if mcp-cli is installed...');
    const isInstalled = await isMcpCliInstalled();
    console.log(`✅ Installation check completed: ${isInstalled ? 'installed' : 'not installed'}\n`);

    if (isInstalled) {
      // Test 2: Execute version command
      console.log('Test 2: Getting version...');
      const versionResult = await executeMcpCli(['--version'], { stdio: 'pipe' });
      console.log(`✅ Version command completed with exit code: ${versionResult.code}`);
      if (versionResult.stdout) {
        console.log(`   Output: ${versionResult.stdout.trim()}`);
      }
      console.log();

      // Test 3: Execute help command
      console.log('Test 3: Getting help...');
      const helpResult = await executeMcpCli(['--help']);
      console.log(`✅ Help command completed with exit code: ${helpResult.code}\n`);

      // Test 4: Execute list command with single string
      console.log('Test 4: Getting list (single string)...');
      const listResult = await executeMcpCli('list -a continue -j');
      console.log(`✅ List command completed with exit code: ${listResult.code}`);
      if (listResult.stdout) {
        console.log(`   Output: ${listResult.stdout.trim()}`);
      }
      if (listResult.stderr) {
        console.log(`   Error: ${listResult.stderr.trim()}`);
      }
      console.log();

      // Test 5: Execute list command with array (to show both formats work)
      console.log('Test 5: Getting list (array format)...');
      const listResult2 = await executeMcpCli(['list', '-a', 'continue', '-j']);
      console.log(`✅ List command completed with exit code: ${listResult2.code}`);
      if (listResult2.stdout) {
        console.log(`   Output: ${listResult2.stdout.trim()}`);
      }
      console.log();
    } else {
      console.log('⚠️  mcp-cli not installed, skipping execution tests');
      console.log('   Run: npm run postinstall');
      console.log('   Or: node scripts/install.js\n');
    }

    console.log('🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };