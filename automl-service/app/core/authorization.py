"""Authorization helpers for role-gated features."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import HTTPException

from app.core.context import user as user_ctx

logger = logging.getLogger(__name__)

SYSADMIN_ROLE = "SysAdmin"


def user_is_sysadmin(user: Optional[user_ctx.User]) -> bool:
    """Return True when the given user has the SysAdmin role."""
    if user is None:
        return False

    expected = SYSADMIN_ROLE.casefold()
    return any((assigned_role or "").casefold() == expected for assigned_role in (user.roles or []))


def current_user_can_modify_storage() -> bool:
    """Return True when the current viewing user is a SysAdmin."""
    try:
        return user_is_sysadmin(user_ctx.get_viewing_user())
    except Exception:
        logger.exception("Failed to resolve current user roles for storage modification check")
        return False


def require_storage_modify() -> None:
    """Raise 403 unless the current viewing user is a SysAdmin."""
    if not current_user_can_modify_storage():
        raise HTTPException(
            status_code=403,
            detail="This operation requires the SysAdmin role.",
        )
