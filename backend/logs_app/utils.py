from __future__ import annotations

from typing import Any

from .models import ActivityLog
from users_app.models import User


def _resolve_user_from_request(request) -> User | None:
    if request is None:
        return None

    req_user = getattr(request, 'user', None)
    if req_user is not None and getattr(req_user, 'is_authenticated', False):
        return req_user

    raw_uid = request.headers.get('X-User-Id')
    if not raw_uid:
        return None

    try:
        return User.objects.filter(pk=int(raw_uid)).first()
    except (TypeError, ValueError):
        return None


def create_activity_log(
    *,
    action: str,
    category: str = 'system',
    details: str = '',
    request=None,
    user=None,
    device=None,
    source: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> ActivityLog:
    resolved_user = user or _resolve_user_from_request(request)

    full_action = action
    if details:
        full_action = f'{action} | {details}'

    return ActivityLog.objects.create(
        user=resolved_user,
        device=device,
        action=full_action,
    )
