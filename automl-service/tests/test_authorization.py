from tests.fake_domino_client import FakeResponse, FakeHttpxClient, FakeDominoClient

def test_current_user_can_modify_storage_when_authz_allows(monkeypatch):
    from app.core import authorization as auth

    fake_httpx = FakeHttpxClient(
        post_payload={"actions": [{"id": "project.change_project_settings-project-1", "result": True}]},
    )
    fake_client = FakeDominoClient(fake_httpx)
    monkeypatch.setattr(
        auth,
        "get_domino_public_api_client_sync",
        lambda: fake_client,
        raising=True,
    )

    assert auth.current_user_can_modify_storage(project_id="project-1") is True
    assert fake_httpx.post_calls == [
        {
            "url": "/account/authz/permissions/authorizedactions",
            "json": {
                "actions": [
                    {
                        "id": "project.change_project_settings-project-1",
                        "code": "project.change_project_settings",
                        "context": {"projectId": "project-1"},
                    }
                ]
            },
        }
    ]


def test_current_user_can_modify_storage_when_authz_denies(monkeypatch):
    from app.core import authorization as auth

    fake_httpx = FakeHttpxClient(
        post_payload={"actions": [{"id": "project.change_project_settings-project-1", "result": False}]},
    )
    fake_client = FakeDominoClient(fake_httpx)
    monkeypatch.setattr(
        auth,
        "get_domino_public_api_client_sync",
        lambda: fake_client,
        raising=True,
    )

    assert auth.current_user_can_modify_storage(project_id="project-1") is False
    assert len(fake_httpx.post_calls) == 1


def test_current_user_can_start_job_when_authz_allows(monkeypatch):
    from app.core import authorization as auth

    fake_httpx = FakeHttpxClient(
        post_payload={"actions": [{"id": "job.project.start_job-project-1", "result": True}]},
    )
    fake_client = FakeDominoClient(fake_httpx)
    monkeypatch.setattr(
        auth,
        "get_domino_public_api_client_sync",
        lambda: fake_client,
        raising=True,
    )

    assert auth.current_user_can_start_job(project_id="project-1") is True
    assert fake_httpx.post_calls == [
        {
            "url": "/account/authz/permissions/authorizedactions",
            "json": {
                "actions": [
                    {
                        "id": "job.project.start_job-project-1",
                        "code": "job.project.start_job",
                        "context": {"projectId": "project-1"},
                    }
                ]
            },
        }
    ]


def test_current_user_can_stop_job_when_authz_allows(monkeypatch):
    from app.core import authorization as auth

    fake_httpx = FakeHttpxClient(
        post_payload={"actions": [{"id": "job.project.stop_job-job-1", "result": True}]},
    )
    fake_client = FakeDominoClient(fake_httpx)
    monkeypatch.setattr(
        auth,
        "get_domino_public_api_client_sync",
        lambda: fake_client,
        raising=True,
    )

    assert auth.current_user_can_stop_job(job_id="job-1") is True
    assert fake_httpx.post_calls == [
        {
            "url": "/account/authz/permissions/authorizedactions",
            "json": {
                "actions": [
                    {
                        "id": "job.project.stop_job-job-1",
                        "code": "job.project.stop_job",
                        "context": {"jobId": "job-1"},
                    }
                ]
            },
        }
    ]


def test_current_user_can_delete_job_when_authz_allows(monkeypatch):
    from app.core import authorization as auth

    fake_httpx = FakeHttpxClient(
        post_payload={"actions": [{"id": "job.project.delete_job-job-1", "result": True}]},
    )
    fake_client = FakeDominoClient(fake_httpx)
    monkeypatch.setattr(
        auth,
        "get_domino_public_api_client_sync",
        lambda: fake_client,
        raising=True,
    )

    assert auth.current_user_can_delete_job(job_id="job-1") is True
    assert fake_httpx.post_calls == [
        {
            "url": "/account/authz/permissions/authorizedactions",
            "json": {
                "actions": [
                    {
                        "id": "job.project.delete_job-job-1",
                        "code": "job.project.delete_job",
                        "context": {"jobId": "job-1"},
                    }
                ]
            },
        }
    ]
