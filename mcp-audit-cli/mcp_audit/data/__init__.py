"""
MCP Audit Data - Known MCP registry and lookups
"""

import json
from pathlib import Path
from typing import Optional

_registry = None


def get_registry() -> dict:
    """Load and cache the known MCP registry"""
    global _registry
    if _registry is None:
        registry_path = Path(__file__).parent / "known_mcps.json"
        _registry = json.loads(registry_path.read_text())
    return _registry


def lookup_mcp(source: str, name: str = None) -> Optional[dict]:
    """Look up an MCP by package name, endpoint URL, or MCP name.

    Priority order:
    1. Exact package match
    2. Endpoint URL match (for remote MCPs)
    3. Exact name match
    4. Partial name match (fallback)
    """
    registry = get_registry()
    source_lower = source.lower()
    name_lower = (name or "").lower()

    # First pass: exact package match
    for mcp in registry["mcps"]:
        if mcp["package"].lower() in source_lower:
            return mcp

    # Second pass: endpoint URL match (prioritize for remote MCPs)
    for mcp in registry["mcps"]:
        if mcp.get("endpoint"):
            endpoint_lower = mcp["endpoint"].lower()
            # Check if source URL matches or contains the endpoint
            if endpoint_lower in source_lower or source_lower in endpoint_lower:
                return mcp
            # Also check if domains match (e.g., mcp.github.com)
            if _extract_domain(endpoint_lower) == _extract_domain(source_lower):
                return mcp

    # Third pass: exact name match
    if name_lower:
        for mcp in registry["mcps"]:
            mcp_name_lower = mcp["name"].lower()
            mcp_id_lower = mcp["id"].lower()
            if name_lower == mcp_name_lower or name_lower == mcp_id_lower:
                return mcp

    # Fourth pass: partial name match (fallback)
    if name_lower:
        for mcp in registry["mcps"]:
            mcp_name_lower = mcp["name"].lower()
            # Name contains MCP name (e.g., "github-integration" contains "github")
            if mcp_name_lower in name_lower or name_lower in mcp_name_lower:
                return mcp

    return None


def _extract_domain(url: str) -> str:
    """Extract domain from URL for matching"""
    # Simple domain extraction
    url = url.replace("https://", "").replace("http://", "")
    # Remove path
    url = url.split("/")[0]
    # Remove port
    url = url.split(":")[0]
    return url


def get_mcps_by_provider(provider: str) -> list[dict]:
    """Get all MCPs from a specific provider"""
    registry = get_registry()
    return [m for m in registry["mcps"] if m["provider"].lower() == provider.lower()]


def get_mcps_by_risk(risk_level: str) -> list[dict]:
    """Get all MCPs with a specific risk level"""
    registry = get_registry()
    return [m for m in registry["mcps"] if m["risk_level"] == risk_level]


def get_verified_mcps() -> list[dict]:
    """Get all verified MCPs"""
    registry = get_registry()
    return [m for m in registry["mcps"] if m.get("verified", False)]


def get_all_endpoints() -> list[dict]:
    """Get all MCPs with known endpoints (for network monitoring)"""
    registry = get_registry()
    return [m for m in registry["mcps"] if m.get("endpoint")]


def get_risk_definition(risk_level: str) -> str:
    """Get the definition for a risk level"""
    registry = get_registry()
    return registry.get("risk_definitions", {}).get(risk_level, "Unknown risk level")


def get_type_definition(mcp_type: str) -> str:
    """Get the definition for an MCP type"""
    registry = get_registry()
    return registry.get("type_definitions", {}).get(mcp_type, "Unknown type")
