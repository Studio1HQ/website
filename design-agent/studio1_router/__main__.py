"""`python -m studio1_router` serves the tools; `python -m studio1_router usage` prints the month."""

from __future__ import annotations

import argparse
import os
import sys

import uvicorn

from studio1_router.guard import GuardConfigError, check_bind_host, read_authorization
from studio1_router.router import Router, default_config_path
from studio1_router.server import build_app, build_server


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="studio1_router")
    parser.add_argument("command", nargs="?", choices=["serve", "usage"], default="serve")
    parser.add_argument("--config", help="router TOML (env STUDIO1_ROUTER_CONFIG)")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args(argv)
    if args.command == "usage":
        print(Router(default_config_path(args.config)).usage_report())
        return 0
    try:
        check_bind_host(args.host)
        authorization = read_authorization(os.environ)
    except GuardConfigError as error:
        print(error, file=sys.stderr)
        return 2
    router = Router(default_config_path(args.config))
    app = build_app(build_server(router), authorization=authorization, port=args.port)
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")
    return 0


if __name__ == "__main__":
    sys.exit(main())
