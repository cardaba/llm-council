"""Cost stats aggregation — read-only walk over data/conversations/*.json."""

import json
import os
from datetime import datetime, timezone
from typing import Any, Dict

from .config import DATA_DIR
from .storage import ensure_data_dir


def aggregate_current_month() -> Dict[str, Any]:
    ensure_data_dir()

    # Boundary = first instant of the current UTC month. Comparing ISO-8601
    # strings is correct because both sides share a sortable canonical form
    # produced by datetime.isoformat() at write time.
    month_start_iso = (
        datetime.now(timezone.utc)
        .replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        .isoformat()
    )

    total = 0.0
    upstream_total = 0.0
    queries = 0
    by_profile: Dict[str, Dict[str, Any]] = {}

    for filename in os.listdir(DATA_DIR):
        if not filename.endswith(".json"):
            continue
        path = os.path.join(DATA_DIR, filename)
        try:
            with open(path, "r") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            # Malformed file or unreadable — skip silently per defensive
            # contract; aggregation must NOT crash the endpoint.
            continue
        if not isinstance(data, dict):
            continue

        # Filter conversations by month using their root created_at; the
        # comparison treats missing created_at as "before this month" so the
        # file is skipped without raising.
        if (data.get("created_at") or "") < month_start_iso:
            continue

        for msg in data.get("messages") or []:
            if not isinstance(msg, dict) or msg.get("role") != "assistant":
                continue
            cost = (msg.get("metadata") or {}).get("cost") or {}
            try:
                t = float(cost.get("total") or 0.0)
                u = float(cost.get("upstream_total") or 0.0)
            except (TypeError, ValueError):
                continue
            if t == 0.0 and u == 0.0:
                continue
            total += t
            upstream_total += u
            queries += 1
            profile = (msg.get("metadata") or {}).get("profile", "unknown")
            bucket = by_profile.setdefault(
                profile,
                {"total": 0.0, "upstream_total": 0.0, "queries": 0},
            )
            bucket["total"] += t
            bucket["upstream_total"] += u
            bucket["queries"] += 1

    # Round per-profile sub-aggregates so the JSON payload stays compact.
    rounded_by_profile = {
        p: {
            "total": round(b["total"], 4),
            "upstream_total": round(b["upstream_total"], 4),
            "queries": b["queries"],
        }
        for p, b in by_profile.items()
    }

    return {
        "current_month": {
            "total_usd": round(total, 4),
            "upstream_total_usd": round(upstream_total, 4),
            "queries": queries,
            "by_profile": rounded_by_profile,
        },
        "current_session_estimate_for_cap": {
            "remaining_pct": max(0.0, 1.0 - total / 100.0),
            "cap_usd": 100.0,
        },
        "currency": "USD",
    }
