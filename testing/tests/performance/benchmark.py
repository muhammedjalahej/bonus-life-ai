"""
Quick benchmark script for critical Bonus Life AI endpoints.

Measures p50/p95/p99 latency for the most performance-sensitive routes:
  - POST /api/v1/diabetes-assessment
  - POST /api/v1/heart-assessment
  - POST /api/v1/ckd-assessment
  - GET  /api/v1/users/me/assessments
  - GET  /api/v1/admin/stats

Usage:
    # Run against a live server
    python benchmark.py --host http://localhost:8001 --runs 50

    # Run inline via pytest (uses TestClient, no server needed)
    pytest benchmark.py -v -s

Requirements: pip install requests tabulate
"""

import argparse
import os
import statistics
import sys
import time

# ── Inline pytest mode ────────────────────────────────────────────────────────

def _is_pytest():
    return "pytest" in sys.modules


# ── Payloads ──────────────────────────────────────────────────────────────────

DIABETES_PAYLOAD = {
    "glucose": 120.0, "blood_pressure": 80.0, "weight": 75.0,
    "height": 170.0, "age": 35, "pregnancies": 0,
    "skin_thickness": 20.0, "insulin": 80.0,
    "diabetes_pedigree_function": 0.5, "language": "english",
}

HEART_PAYLOAD = {
    "age": 55, "sex": 1, "cp": 1, "trestbps": 130, "chol": 250,
    "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
    "oldpeak": 1.0, "slope": 1, "ca": 0, "thal": 3, "language": "english",
}

CKD_PAYLOAD = {
    "age": 45.0, "blood_pressure": 80.0, "specific_gravity": 1.020,
    "albumin": 0, "sugar": 0, "red_blood_cells": 0, "pus_cell": 0,
    "pus_cell_clumps": 0, "bacteria": 0, "blood_glucose_random": 120.0,
    "blood_urea": 25.0, "serum_creatinine": 1.0, "sodium": 140.0,
    "potassium": 4.5, "hemoglobin": 13.0, "packed_cell_volume": 40.0,
    "white_blood_cell_count": 7800.0, "red_blood_cell_count": 5.0,
    "hypertension": 0, "diabetes_mellitus": 0, "coronary_artery_disease": 0,
    "appetite": 1, "pedal_edema": 0, "anemia": 0, "language": "english",
}


# ── Core benchmarking logic ───────────────────────────────────────────────────

class BenchmarkResult:
    def __init__(self, name: str, latencies: list[float], errors: int):
        self.name = name
        self.latencies = sorted(latencies)
        self.errors = errors

    @property
    def p50(self) -> float:
        return statistics.median(self.latencies) if self.latencies else 0.0

    @property
    def p95(self) -> float:
        if not self.latencies:
            return 0.0
        idx = int(len(self.latencies) * 0.95)
        return self.latencies[min(idx, len(self.latencies) - 1)]

    @property
    def p99(self) -> float:
        if not self.latencies:
            return 0.0
        idx = int(len(self.latencies) * 0.99)
        return self.latencies[min(idx, len(self.latencies) - 1)]

    @property
    def mean(self) -> float:
        return statistics.mean(self.latencies) if self.latencies else 0.0

    @property
    def success_rate(self) -> float:
        total = len(self.latencies) + self.errors
        return (len(self.latencies) / total * 100) if total else 0.0


def _benchmark_endpoint(session_or_client, method: str, url: str, runs: int,
                         json=None, headers=None) -> BenchmarkResult:
    latencies = []
    errors = 0
    for _ in range(runs):
        try:
            t0 = time.perf_counter()
            if method == "GET":
                r = session_or_client.get(url, headers=headers)
            else:
                r = session_or_client.post(url, json=json, headers=headers)
            elapsed = (time.perf_counter() - t0) * 1000  # ms
            if r.status_code < 500:
                latencies.append(elapsed)
            else:
                errors += 1
        except Exception:
            errors += 1
    name = url.split("/api/v1/")[-1] if "/api/v1/" in url else url
    return BenchmarkResult(name, latencies, errors)


def _print_results(results: list[BenchmarkResult]):
    try:
        from tabulate import tabulate
        rows = [
            [r.name, f"{r.mean:.1f}", f"{r.p50:.1f}", f"{r.p95:.1f}",
             f"{r.p99:.1f}", f"{r.success_rate:.0f}%"]
            for r in results
        ]
        print("\n" + tabulate(
            rows,
            headers=["Endpoint", "Mean (ms)", "p50 (ms)", "p95 (ms)", "p99 (ms)", "Success"],
            tablefmt="rounded_outline",
        ))
    except ImportError:
        print(f"\n{'Endpoint':<45} {'Mean':>8} {'p50':>8} {'p95':>8} {'p99':>8} {'OK%':>6}")
        print("-" * 90)
        for r in results:
            print(f"{r.name:<45} {r.mean:>7.1f} {r.p50:>7.1f} "
                  f"{r.p95:>7.1f} {r.p99:>7.1f} {r.success_rate:>5.0f}%")


# ── HTTP mode (against a running server) ────────────────────────────────────

def run_http_benchmark(host: str, runs: int):
    import requests

    session = requests.Session()
    base = host.rstrip("/")

    # Register and login to get a token
    import random, string
    suffix = "".join(random.choices(string.ascii_lowercase, k=8))
    email = f"bench_{suffix}@example.com"

    reg = session.post(f"{base}/api/v1/auth/register", json={
        "email": email, "password": "BenchmarkPass1!", "full_name": "Benchmark User",
    })
    if reg.status_code == 200:
        token = reg.json()["access_token"]
    else:
        print(f"[warn] registration returned {reg.status_code}, benchmarks may fail auth checks")
        token = ""

    headers = {"Authorization": f"Bearer {token}"} if token else {}
    admin_headers = {}

    # Try admin login
    adm = session.post(f"{base}/api/v1/auth/login", json={
        "email": "admin@example.com", "password": "AdminPass123!",
    })
    if adm.status_code == 200:
        admin_headers = {"Authorization": f"Bearer {adm.json()['access_token']}"}

    print(f"\nBenchmarking {base}  ({runs} runs per endpoint)...")

    results = [
        _benchmark_endpoint(session, "POST", f"{base}/api/v1/diabetes-assessment",
                            runs, json=DIABETES_PAYLOAD, headers=headers),
        _benchmark_endpoint(session, "POST", f"{base}/api/v1/heart-assessment",
                            runs, json=HEART_PAYLOAD, headers=headers),
        _benchmark_endpoint(session, "POST", f"{base}/api/v1/ckd-assessment",
                            runs, json=CKD_PAYLOAD, headers=headers),
        _benchmark_endpoint(session, "GET", f"{base}/api/v1/users/me/assessments",
                            runs, headers=headers),
        _benchmark_endpoint(session, "GET", f"{base}/api/v1/announcements/active",
                            runs, headers=headers),
    ]

    if admin_headers:
        results += [
            _benchmark_endpoint(session, "GET", f"{base}/api/v1/admin/stats",
                                runs, headers=admin_headers),
            _benchmark_endpoint(session, "GET", f"{base}/api/v1/admin/users",
                                runs, headers=admin_headers),
        ]

    _print_results(results)
    return results


# ── Pytest mode (uses TestClient, no server needed) ───────────────────────────

def _get_test_client():
    """Import the minimal test app from conftest.py patterns."""
    _here = os.path.dirname(__file__)
    _backend = os.path.normpath(os.path.join(_here, "..", "..", "..", "app", "backend"))
    if _backend not in sys.path:
        sys.path.insert(0, _backend)

    import tempfile
    db_path = tempfile.mktemp(suffix=".db")
    os.environ.setdefault("DATABASE_URL", f"sqlite:///{db_path}")
    os.environ.setdefault("JWT_SECRET", "test-jwt-secret-not-for-production-aabb1122")

    from unittest.mock import MagicMock, AsyncMock
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.database import Base, get_db
    from app.routes import auth as auth_route
    from app.routes import assessment as assess_route
    from app.routes import heart as heart_route
    from app.routes import ckd as ckd_route

    engine = create_engine(
        os.environ["DATABASE_URL"],
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)

    mock_model = MagicMock()
    mock_model.predict_proba.return_value = [[0.3, 0.7]]
    mock_model.predict.return_value = [1]
    assess_route._diabetes_model = mock_model
    heart_route._heart_model = mock_model
    ckd_route._ckd_model = mock_model

    mock_ai = AsyncMock()
    mock_ai.return_value = {"recommendation": "test", "risk_factors": [], "lifestyle_tips": []}
    assess_route._ai_specialist = mock_ai
    heart_route._ai_specialist = mock_ai
    ckd_route._ai_specialist = mock_ai

    mini_app = FastAPI()
    mini_app.include_router(auth_route.router, prefix="/api/v1")
    mini_app.include_router(assess_route.router, prefix="/api/v1")
    mini_app.include_router(heart_route.router, prefix="/api/v1")
    mini_app.include_router(ckd_route.router, prefix="/api/v1")

    def _override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    mini_app.dependency_overrides[get_db] = _override_db
    return TestClient(mini_app, raise_server_exceptions=False)


import pytest


@pytest.fixture(scope="module")
def bench_client():
    return _get_test_client()


@pytest.fixture(scope="module")
def bench_user_headers(bench_client):
    r = bench_client.post("/api/v1/auth/register", json={
        "email": "bench_pytest@example.com",
        "password": "BenchmarkPass1!",
        "full_name": "Bench User",
    })
    if r.status_code == 200:
        return {"Authorization": f"Bearer {r.json()['access_token']}"}
    r2 = bench_client.post("/api/v1/auth/login", json={
        "email": "bench_pytest@example.com",
        "password": "BenchmarkPass1!",
    })
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}


BENCHMARK_RUNS = int(os.environ.get("BENCH_RUNS", "20"))
LATENCY_P95_THRESHOLD_MS = float(os.environ.get("BENCH_P95_MAX_MS", "500"))


def _run_and_assert(client, method, url, runs, json_body=None, headers=None,
                    p95_threshold=LATENCY_P95_THRESHOLD_MS):
    result = _benchmark_endpoint(client, method, url, runs, json=json_body, headers=headers)
    print(f"\n  {result.name}: mean={result.mean:.1f}ms  p50={result.p50:.1f}ms  "
          f"p95={result.p95:.1f}ms  p99={result.p99:.1f}ms  ok={result.success_rate:.0f}%")
    assert result.success_rate >= 90.0, (
        f"{result.name}: success rate {result.success_rate:.0f}% < 90%"
    )
    assert result.p95 < p95_threshold, (
        f"{result.name}: p95 {result.p95:.1f}ms exceeds threshold {p95_threshold}ms"
    )
    return result


def test_benchmark_diabetes_assessment(bench_client, bench_user_headers):
    _run_and_assert(
        bench_client, "POST", "/api/v1/diabetes-assessment",
        BENCHMARK_RUNS, json_body=DIABETES_PAYLOAD, headers=bench_user_headers,
    )


def test_benchmark_heart_assessment(bench_client, bench_user_headers):
    _run_and_assert(
        bench_client, "POST", "/api/v1/heart-assessment",
        BENCHMARK_RUNS, json_body=HEART_PAYLOAD, headers=bench_user_headers,
    )


def test_benchmark_ckd_assessment(bench_client, bench_user_headers):
    _run_and_assert(
        bench_client, "POST", "/api/v1/ckd-assessment",
        BENCHMARK_RUNS, json_body=CKD_PAYLOAD, headers=bench_user_headers,
    )


def test_benchmark_assessment_history(bench_client, bench_user_headers):
    _run_and_assert(
        bench_client, "GET", "/api/v1/users/me/assessments",
        BENCHMARK_RUNS, headers=bench_user_headers,
        p95_threshold=200.0,
    )


def test_benchmark_register_endpoint(bench_client):
    import random, string
    results = []
    errors = 0
    for i in range(BENCHMARK_RUNS):
        suffix = "".join(random.choices(string.ascii_lowercase, k=6))
        t0 = time.perf_counter()
        r = bench_client.post("/api/v1/auth/register", json={
            "email": f"bench_{suffix}@example.com",
            "password": "BenchmarkPass1!",
        })
        elapsed = (time.perf_counter() - t0) * 1000
        if r.status_code < 500:
            results.append(elapsed)
        else:
            errors += 1

    result = BenchmarkResult("auth/register", results, errors)
    print(f"\n  auth/register: mean={result.mean:.1f}ms  p95={result.p95:.1f}ms  "
          f"ok={result.success_rate:.0f}%")
    assert result.success_rate >= 90.0


# ── CLI entrypoint ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bonus Life AI endpoint benchmarks")
    parser.add_argument("--host", default="http://localhost:8001",
                        help="Base URL of the running API server")
    parser.add_argument("--runs", type=int, default=50,
                        help="Number of requests per endpoint (default: 50)")
    args = parser.parse_args()

    run_http_benchmark(args.host, args.runs)
