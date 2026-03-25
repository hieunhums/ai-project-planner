"""
AI Replan Service — Uses Azure OpenAI o3 with Entra ID (AzureCliCredential)
to reason over scheduling changes and produce an optimized plan.
"""

import json
import logging
import csv
import io
import os
from typing import Optional

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI

logger = logging.getLogger(__name__)

# ── Azure OpenAI Client (singleton) ──────────────────────────────────────────

_client: Optional[AzureOpenAI] = None

def _get_client() -> AzureOpenAI:
    global _client
    if _client is None:
        credential = DefaultAzureCredential()
        token_provider = get_bearer_token_provider(
            credential, "https://cognitiveservices.azure.com/.default"
        )
        _client = AzureOpenAI(
            azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", "https://your-openai-resource.cognitiveservices.azure.com/"),
            azure_ad_token_provider=token_provider,
            api_version="2025-04-01-preview",
        )
    return _client


# ── Replan Logic ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert shipyard scheduling planner for Seatrium, a major Singapore-based shipyard company.

You manage scheduling across these Singapore yards: Tuas, Tuas Boulevard, Pioneer, Admiralty, Benoi.
Processes include: Drydock (hull assembly), Loadout (topside installation), Berthing (outfitting), Fabrication/Grand Assembly (block construction).

When given an existing schedule (CSV data) and a set of changes/constraints, you must:
1. Analyze the current schedule
2. Apply the requested changes
3. Optimize the affected tasks
4. Produce a NEW schedule (same CSV format) with only the CHANGED rows
5. Explain your reasoning for EVERY change

Your response MUST be valid JSON with this exact structure:
{
  "changed_rows": [
    {"project_id": "...", "project_name": "...", "duration_days": N, "start_date": "DD-MM-YYYY", "end_date": "DD-MM-YYYY", "resource": "...", "dependencies": "...", "cost": "...", "priority": "..."}
  ],
  "reasoning": {
    "summary": "One paragraph explaining what you changed and why",
    "per_task": {
      "PROJECT_ID": "Explanation for this specific change"
    },
    "tradeoffs": ["Tradeoff 1", "Tradeoff 2"]
  }
}

Important rules:
- Only return rows that CHANGED. Do not return unchanged rows.
- Keep date format as DD-MM-YYYY
- Resource names must match existing yard names exactly (e.g. "Tuas Boulevard - YST D2")
- Consider scheduling conflicts: two projects cannot occupy the same yard at overlapping dates
- Consider hull dimensions when filtering yards (larger hulls need larger drydocks)
- Consider transportation distance between yards (prefer closer yards for related processes)
- Be specific in your reasoning — mention yard names, dates, and project IDs"""


def summarize_plan(plan_rows: list[dict], max_rows: int = 100) -> str:
    """Summarize plan as CSV text for the prompt. Truncate if too large."""
    if not plan_rows:
        return "(empty plan)"

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        'project_id', 'project_name', 'duration_days', 'start_date', 'end_date', 'resource', 'dependencies', 'cost', 'priority'
    ])
    writer.writeheader()

    # Include all rows if under limit, otherwise sample
    rows_to_write = plan_rows[:max_rows]
    for row in rows_to_write:
        writer.writerow({k: row.get(k, '') for k in writer.fieldnames})

    result = output.getvalue()
    if len(plan_rows) > max_rows:
        result += f"\n... ({len(plan_rows) - max_rows} more rows not shown, total: {len(plan_rows)} rows)"

    return result


def build_replan_prompt(plan_csv_text: str, changes: dict) -> str:
    """Build the user prompt for the replan request."""
    parts = [f"Here is the current shipyard schedule ({changes.get('total_rows', '?')} total rows):\n\n```csv\n{plan_csv_text}\n```\n"]

    project_name = changes.get('project_name', '')
    if project_name:
        parts.append(f"\nThe planner is working on project **{project_name}** and has requested these changes FOR THIS PROJECT:\n")
    else:
        parts.append("\nThe planner has requested these changes:\n")

    if changes.get('hull_length'):
        parts.append(f"- Hull length changed to {changes['hull_length']}m")
    if changes.get('hull_width'):
        parts.append(f"- Hull width changed to {changes['hull_width']}m")
    if changes.get('hull_height'):
        parts.append(f"- Hull height changed to {changes['hull_height']}m")
    if changes.get('topside_weight'):
        parts.append(f"- Topside weight changed to {changes['topside_weight']}t")
    if changes.get('preferred_location'):
        parts.append(f"- Preferred location: {changes['preferred_location']}")
    if changes.get('preferred_yard'):
        parts.append(f"- Preferred yard: {changes['preferred_yard']}")
    if changes.get('optimization_goal'):
        goal = changes['optimization_goal'].replace('_', ' ')
        parts.append(f"- Optimization goal: {goal}")
    if changes.get('constraints'):
        for c in changes['constraints']:
            parts.append(f"- Constraint: {c}")
    if changes.get('free_text'):
        parts.append(f"- Additional notes: {changes['free_text']}")

    if project_name:
        parts.append(f"\nYou MUST replan **{project_name}** specifically:")
        parts.append(f"- If a preferred yard is specified, you MUST move {project_name}'s phases to that yard. Find available docks/berths within that yard.")
        parts.append(f"- If the preferred yard truly cannot accommodate the vessel (e.g. dock too small), move as many phases as possible and explain which ones couldn't move and why.")
        parts.append(f"- Adjust dates to avoid conflicts with other vessels already scheduled at the target yard.")
        parts.append(f"- Return ONLY changed rows for {project_name}. Do not return unchanged rows or rows for other projects.")
    else:
        parts.append("\nAnalyze the schedule, apply these changes, and return the optimized result as JSON.")

    return "\n".join(parts)


MODEL = "gpt-5.4-mini"


def _parse_ai_response(raw_content: str) -> dict:
    """Parse JSON from AI response, handling markdown fences."""
    try:
        content = raw_content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        return json.loads(content)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse AI response as JSON: {raw_content[:500]}")
        return {
            "changed_rows": [],
            "reasoning": {
                "summary": raw_content[:1000],
                "per_task": {},
                "tradeoffs": ["AI response was not in expected JSON format — showing raw reasoning above"],
            },
        }


def replan(plan_rows: list[dict], changes: dict) -> dict:
    """
    Call Azure OpenAI to replan the schedule (non-streaming).
    """
    client = _get_client()
    changes['total_rows'] = len(plan_rows)
    plan_csv_text = summarize_plan(plan_rows, max_rows=150)
    user_prompt = build_replan_prompt(plan_csv_text, changes)

    logger.info(f"Replan request: {len(plan_rows)} rows, model={MODEL}")

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw_content = response.choices[0].message.content
    model = response.model
    tokens = response.usage
    logger.info(f"Replan response: model={model}, tokens={tokens}")

    result = _parse_ai_response(raw_content)

    return {
        "changed_rows": result.get("changed_rows", []),
        "reasoning": result.get("reasoning", {"summary": "No reasoning provided", "per_task": {}, "tradeoffs": []}),
        "model": model,
        "tokens_used": {
            "prompt": getattr(tokens, 'prompt_tokens', 0),
            "completion": getattr(tokens, 'completion_tokens', 0),
            "total": getattr(tokens, 'total_tokens', 0),
        } if tokens else {},
    }


def replan_stream(plan_rows: list[dict], changes: dict):
    """
    Stream replan response. Yields SSE events:
      event: token   data: {"text": "..."}
      event: done    data: {"model": "...", "result": {...}}
      event: error   data: {"message": "..."}
    """
    client = _get_client()
    changes['total_rows'] = len(plan_rows)
    plan_csv_text = summarize_plan(plan_rows, max_rows=150)
    user_prompt = build_replan_prompt(plan_csv_text, changes)

    logger.info(f"Replan stream request: {len(plan_rows)} rows, model={MODEL}")

    try:
        stream = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            stream=True,
        )

        full_content = ""
        model_name = MODEL

        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_content += token
                yield f"event: token\ndata: {json.dumps({'text': token})}\n\n"

            if chunk.model:
                model_name = chunk.model

        # Parse final result
        result = _parse_ai_response(full_content)

        yield f"event: done\ndata: {json.dumps({'model': model_name, 'result': result})}\n\n"

    except Exception as e:
        logger.error(f"Replan stream error: {e}")
        yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
