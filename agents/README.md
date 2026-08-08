# Project-scoped Zhihuiti agents

This integration gives an MCP-compatible client access to Zhihuiti's research,
analysis, coding-review, strategy, and orchestration roles. The wrapper adds the
Software Supply Chain context to every task and goal while keeping repository
tools disabled.

Each project receives its own SQLite memory under `.zhihuiti/`. Do not point
this configuration at another project's database or enable `ZHIHUITI_TOOLS`
without replacing Zhihuiti's global tool allowlist with a repository-scoped
adapter.

## One-time setup

Run from the repository root:

```bash
python3 -m venv .venv-zhihuiti
./.venv-zhihuiti/bin/pip install \
  "git+https://github.com/doggychip/zhihuiti.git@03a65dd6ff856f6138ad5d7e9b55ce70ccdc1095#subdirectory=zhihuiti"
npm run agents:check
```

Provide `DEEPSEEK_API_KEY` through the desktop client's environment or an
approved secret manager. Do not add the key to `.mcp.json` or commit it.

Open this repository in an MCP-compatible client. It will discover `.mcp.json`
and expose the project-scoped server as `zhihuiti-software-supply-chain`.

Use `zhihuiti_execute_goal` for multi-step work and `zhihuiti_execute_task` for
a focused role. Initial examples:

- Research structural risks across the tracked software value chain.
- Review a supplied dashboard change for correctness and missing tests.
- Compare the competitive positioning of a supplied group of companies.
- Propose a test plan for a new dashboard data source.

The agents return analysis and patch proposals as text. They cannot edit files,
run deployments, place trades, or promote themselves in this configuration.

## Hosted deployment

For a continuously available service, deploy a separate Zhihuiti instance with
its own persistent volume, database, operator token, and project-specific model
credential. Do not reuse the main Zhihuiti production database. Keep the same
disabled safety settings until a project-root-restricted write adapter is added
and reviewed.
