"""Natural Language command parser for plan editing."""

import re
from typing import Optional

# Supported pattern:
#   change PRJ-XXX from RESOURCE-A to RESOURCE-B
_NL_PATTERN = re.compile(
    r"change\s+(?P<project_id>PRJ-[A-Z0-9]+)"
    r"\s+from\s+(?P<from_value>[^\s]+)"
    r"\s+to\s+(?P<to_value>[^\s]+)",
    re.IGNORECASE,
)


def parse_nl_command(command: str) -> Optional[dict]:
    """Parse a natural-language plan-edit command.

    Parameters
    ----------
    command : str
        Free-text command, e.g. ``"change PRJ-F01 from JY-QA to JY-QB"``.

    Returns
    -------
    dict or None
        ``{"project_id": ..., "field": "resource", "from_value": ..., "to_value": ...}``
        when the command matches; ``None`` otherwise.
    """
    if not command or not command.strip():
        return None

    m = _NL_PATTERN.search(command.strip())
    if not m:
        return None

    return {
        "project_id": m.group("project_id").upper(),
        "field": "resource",
        "from_value": m.group("from_value"),
        "to_value": m.group("to_value"),
    }
