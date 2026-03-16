"""Natural Language command parser for plan editing."""

import re
from typing import Optional

# Supported patterns:
#   change <PROJECT_ID> from <RESOURCE_A> to <RESOURCE_B>
#   change <PROJECT_ID> from "<RESOURCE_A>" to "<RESOURCE_B>"
_NL_PATTERN_QUOTED = re.compile(
    r"^\s*change\s+(?P<project_id>\S+) drydock"
    r"\s+from\s+\"(?P<from_value>.+?)\""
    r"\s+to\s+\"(?P<to_value>.+?)\"\s*$",
    re.IGNORECASE,
)

_NL_PATTERN_UNQUOTED = re.compile(
    r"^\s*change\s+(?P<project_id>\S+) drydock"
    r"\s+from\s+(?P<from_value>.+?)"
    r"\s+to\s+(?P<to_value>.+?)\s*$",
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

    text = command.strip()
    m = _NL_PATTERN_QUOTED.match(text) or _NL_PATTERN_UNQUOTED.match(text)
    if not m:
        return None

    from_value = m.group("from_value").strip()
    to_value = m.group("to_value").strip()
    if not from_value or not to_value:
        return None

    return {
        "project_id": m.group("project_id").upper(),
        "field": "resource",
        "from_value": from_value,
        "to_value": to_value,
    }
