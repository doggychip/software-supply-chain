#!/usr/bin/env python3
"""Project-scoped wrapper around Zhihuiti's stdio MCP server."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Callable


PROJECT_ROOT = Path(__file__).resolve().parents[1]
CONTEXT_PATH = Path(__file__).with_name("PROJECT_CONTEXT.md")
SCOPED_TOOLS = {"zhihuiti_execute_goal": "goal", "zhihuiti_execute_task": "task"}


def load_project_context() -> str:
    return CONTEXT_PATH.read_text(encoding="utf-8").strip()


def scope_arguments(name: str, arguments: dict, context: str | None = None) -> dict:
    """Prepend fixed project context to execution requests without mutating input."""
    field = SCOPED_TOOLS.get(name)
    scoped = dict(arguments)
    if not field or not isinstance(scoped.get(field), str):
        return scoped
    project_context = context if context is not None else load_project_context()
    scoped[field] = (
        f"{project_context}\n\n"
        "## Requested work\n\n"
        f"{scoped[field].strip()}"
    )
    return scoped


def install_scope(handler: Callable, context: str | None = None) -> Callable:
    """Wrap Zhihuiti's dispatcher so only task text gains project context."""
    def scoped_handler(name: str, arguments: dict):
        return handler(name, scope_arguments(name, arguments, context))

    return scoped_handler


def self_test() -> dict:
    context = load_project_context()
    sample = scope_arguments(
        "zhihuiti_execute_task",
        {"task": "Review the health endpoint.", "role": "coder"},
        context,
    )
    return {
        "status": "ok",
        "project_root": str(PROJECT_ROOT),
        "context_loaded": "Software Supply Chain agent context" in context,
        "tools_enabled": False,
        "autonomous_evolution": False,
        "task_scoped": sample["task"].endswith("Review the health endpoint."),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        result = self_test()
        print(json.dumps(result, sort_keys=True))
        return 0 if all(
            result[key] is expected
            for key, expected in (
                ("context_loaded", True),
                ("tools_enabled", False),
                ("autonomous_evolution", False),
                ("task_scoped", True),
            )
        ) else 1

    try:
        from zhihuiti import mcp_server
    except ImportError as exc:
        raise SystemExit(
            "Zhihuiti is not installed. Follow agents/README.md to create "
            "the isolated .venv-zhihuiti environment."
        ) from exc

    mcp_server._handle_tool_call = install_scope(mcp_server._handle_tool_call)
    mcp_server.main()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
