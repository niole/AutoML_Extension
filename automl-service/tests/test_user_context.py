import pytest


@pytest.fixture(autouse=True)
def clear_user_context():
    """Reset the per-request user ContextVar before and after each test."""
    from app.core.context import user as user_ctx

    token = user_ctx._user_ctx.set(None)
    try:
        yield
    finally:
        # Restore previous state to avoid cross-test leakage
        user_ctx._user_ctx.reset(token)


def _make_user_envelope(user_id: str, user_name: str, roles=None):
    from app.api.generated.domino_public_api_client.models.metadata_v1 import (
        MetadataV1,
    )
    from app.api.generated.domino_public_api_client.models.user_envelope_v1 import (
        UserEnvelopeV1,
    )
    from app.api.generated.domino_public_api_client.models.user_v1 import UserV1

    user = UserV1(
        avatar_url="",
        first_name="First",
        full_name="First Last",
        id=user_id,
        last_name="Last",
        user_name=user_name,
        roles=roles,
    )
    meta = MetadataV1(notices=[], request_id="req-1")
    return UserEnvelopeV1(metadata=meta, user=user)


def test_get_viewing_user_fetches_and_caches(monkeypatch):
    """First call fetches from API, subsequent calls use cached user."""
    from app.core.context import user as user_ctx
    from app.api.generated.domino_public_api_client.api import users as users_api

    # Avoid real client construction/host resolution
    monkeypatch.setattr(user_ctx, "get_domino_public_api_client_sync", lambda: object())

    calls = {"n": 0}

    def fake_sync(*, client):  # signature must match get_current_user.sync
        calls["n"] += 1
        return _make_user_envelope("u-1", "alice", roles=["Admin", "Viewer"])

    monkeypatch.setattr(users_api.get_current_user, "sync", fake_sync)

    u1 = user_ctx.get_viewing_user()
    assert u1 is not None
    assert u1.id == "u-1"
    assert u1.user_name == "alice"
    assert u1.roles == ["Admin", "Viewer"]

    # Second call should hit cache, not the API
    u2 = user_ctx.get_viewing_user()
    assert u2 is u1
    assert calls["n"] == 1


def test_get_viewing_user_roles_unset_becomes_empty(monkeypatch):
    """If roles are UNSET in API model, surface as empty list."""
    from app.core.context import user as user_ctx
    from app.api.generated.domino_public_api_client.api import users as users_api

    # Avoid real client construction/host resolution
    monkeypatch.setattr(user_ctx, "get_domino_public_api_client_sync", lambda: object())

    def fake_sync(*, client):
        # No roles passed -> remains UNSET on model
        return _make_user_envelope("u-2", "bob", roles=None)

    monkeypatch.setattr(users_api.get_current_user, "sync", fake_sync)

    u = user_ctx.get_viewing_user()
    assert u is not None
    assert u.id == "u-2"
    assert u.user_name == "bob"
    # The context wrapper normalizes UNSET/None -> []
    assert u.roles == []

