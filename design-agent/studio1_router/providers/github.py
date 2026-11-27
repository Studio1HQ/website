"""GitHub: public company facts from the REST API (optional GITHUB_TOKEN raises the rate limit).

Docs used, 2026-11-27: https://docs.github.com/en/rest (repos, search, releases and orgs pages),
with one unauthenticated call each to /search/repositories and /orgs/{org} to check the shapes.
  GET /repos/{owner}/{repo}                  stargazers_count, forks_count, open_issues_count,
                                             pushed_at, description
  GET /repos/{owner}/{repo}/releases/latest  published_at (404 when there is no release)
  GET /search/repositories?q=user:{owner}&sort=stars   top repositories of an org or user
  GET /search/repositories?q={name}  and  GET /search/users?q={name}+type:org   items carry `score`
  GET /orgs/{org}                            name, description, blog (the org's website),
                                             public_repos (404 when the owner is not an org)
Every endpoint is verified.

With `website` and no `github`, an org from the name search counts as the company only when the
website on its GitHub profile (`blog`) is on the same host. That is the only way a search result
becomes facts; otherwise the answer is candidates, never a confirmed match.
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlsplit

from studio1_router.providers.base import (
    Call,
    Provider,
    ProviderError,
    as_dict,
    parse_json,
    request,
)

API = "https://api.github.com"
REF = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*(/[A-Za-z0-9._-]+)?")
#: How many orgs from the name search have their profile's website compared.
MAX_ORG_CHECKS = 3
NOTE = (
    "These are candidates from GitHub search, ranked by GitHub's own score. None is confirmed "
    "as the company; pass `github` (an org or owner/repo) to get facts."
)


def _headers(call: Call) -> dict[str, str]:
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if call.key:
        headers["Authorization"] = f"Bearer {call.key}"
    return headers


async def _get(call: Call, path: str, params: dict[str, str | int] | None = None) -> dict[str, Any]:
    return as_dict(
        parse_json(await request(call, "GET", API + path, headers=_headers(call), params=params))
    )


def site_host(url: str) -> str:
    """The host of a website, lowercased and without `www.`; empty when there is none."""
    raw = url.strip()
    if not raw:
        return ""
    try:
        host = urlsplit(raw if "://" in raw else f"https://{raw}").hostname or ""
    except ValueError:
        return ""
    return host.lower().removeprefix("www.")


def _repo(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": item.get("full_name"),
        "url": item.get("html_url"),
        "description": item.get("description"),
        "stars": item.get("stargazers_count"),
        "forks": item.get("forks_count"),
        "open_issues": item.get("open_issues_count"),
        "last_push": item.get("pushed_at"),
    }


async def _latest_release(call: Call, full_name: str) -> str | None:
    try:
        data = await _get(call, f"/repos/{full_name}/releases/latest")
    except ProviderError as exc:
        if str(exc) == "HTTP 404":
            return None
        raise
    published = data.get("published_at")
    return published if isinstance(published, str) else None


async def _top_repos(call: Call, owner: str) -> list[dict[str, Any]]:
    data = await _get(
        call,
        "/search/repositories",
        {"q": f"user:{owner}", "sort": "stars", "order": "desc", "per_page": 5},
    )
    items = data.get("items")
    return [_repo(i) for i in items if isinstance(i, dict)] if isinstance(items, list) else []


async def _org(call: Call, login: str) -> dict[str, Any] | None:
    """The org's own profile, or None when the owner is a user rather than an org."""
    try:
        data = await _get(call, f"/orgs/{login}")
    except ProviderError as exc:
        if str(exc) == "HTTP 404":
            return None
        raise
    return {
        "login": data.get("login"),
        "name": data.get("name"),
        "description": data.get("description"),
        "website": data.get("blog"),
        "url": data.get("html_url"),
        "public_repos": data.get("public_repos"),
    }


class GitHub(Provider):
    name = "github"
    key_env = "GITHUB_TOKEN"
    key_required = False
    VERIFIED = {"lookup": True}

    async def lookup(
        self, call: Call, name: str, github: str | None, website: str | None = None
    ) -> dict[str, Any]:
        if github is not None:
            ref = github.strip().removeprefix("https://github.com/").strip("/")
            if not REF.fullmatch(ref):
                raise ProviderError("github must be an org or owner/repo")
            return await self._facts(call, name, ref, await _org(call, ref.split("/")[0]))
        orgs = await self._org_candidates(call, name)
        wanted = site_host(website or "")
        if wanted:
            for found in orgs[:MAX_ORG_CHECKS]:
                login = found.get("github")
                if not isinstance(login, str) or "/" in login or not REF.fullmatch(login):
                    continue
                org = await _org(call, login)
                if org is not None and site_host(str(org.get("website") or "")) == wanted:
                    return {**await self._facts(call, name, login, org), "matched_by": "website"}
        return await self._candidates(call, name, orgs)

    async def _facts(
        self, call: Call, name: str, ref: str, org: dict[str, Any] | None
    ) -> dict[str, Any]:
        owner = ref.split("/")[0]
        top = await _top_repos(call, owner)
        if "/" in ref:
            headline = _repo(await _get(call, f"/repos/{ref}"))
        elif top:
            headline = dict(top[0])
        else:
            raise ProviderError("no public repositories found for that org")
        headline["latest_release"] = await _latest_release(call, str(headline["name"]))
        return {
            "kind": "facts",
            "query": name,
            "github": ref,
            "org": org,
            "headline_repository": headline,
            "top_repositories": top,
        }

    async def _org_candidates(self, call: Call, name: str) -> list[dict[str, Any]]:
        users = await _get(call, "/search/users", {"q": f"{name} type:org", "per_page": 3})
        return [
            {
                "type": "org",
                "github": u.get("login"),
                "url": u.get("html_url"),
                "score": u.get("score"),
            }
            for u in users.get("items") or []
            if isinstance(u, dict)
        ]

    async def _candidates(
        self, call: Call, name: str, orgs: list[dict[str, Any]]
    ) -> dict[str, Any]:
        found = list(orgs)
        repos = await _get(call, "/search/repositories", {"q": name, "per_page": 5})
        for r in repos.get("items") or []:
            if isinstance(r, dict):
                found.append(
                    {
                        "type": "repo",
                        "github": r.get("full_name"),
                        "url": r.get("html_url"),
                        "stars": r.get("stargazers_count"),
                        "score": r.get("score"),
                    }
                )
        return {"kind": "candidates", "query": name, "note": NOTE, "candidates": found}


PROVIDER = GitHub()
