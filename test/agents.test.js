const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

test('Zhihuiti MCP configuration is isolated and non-autonomous', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, '.mcp.json'), 'utf8'));
  const server = config.mcpServers['zhihuiti-software-supply-chain'];

  assert.equal(server.env.ZHIHUITI_DB, '.zhihuiti/software-supply-chain.db');
  assert.equal(server.env.ZHIHUITI_TOOLS, '0');
  assert.equal(server.env.ZHIHUITI_AUTO_EVOLVE, '0');
  assert.equal(server.env.ZHIHUITI_ALLOW_AUTO_MINT, '0');
  assert.equal(JSON.stringify(config).includes('API_KEY'), false);
});

test('Zhihuiti project wrapper passes its self-test without credentials', () => {
  const output = execFileSync(
    'python3',
    [path.join(root, 'agents', 'software_supply_chain_mcp.py'), '--self-test'],
    { encoding: 'utf8' }
  );
  const result = JSON.parse(output);

  assert.equal(result.status, 'ok');
  assert.equal(result.context_loaded, true);
  assert.equal(result.tools_enabled, false);
  assert.equal(result.autonomous_evolution, false);
  assert.equal(result.task_scoped, true);
});
