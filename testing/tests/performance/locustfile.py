"""
Locust load test for Bonus Life AI backend.

Usage:
    cd testing/tests/performance
    locust -f locustfile.py --host http://localhost:8001 --users 50 --spawn-rate 5

Scenarios covered:
  - UserBehavior:  register → login → run assessments → view history
  - AdminBehavior: login as admin → view stats → manage users
  - ReadOnlyBehavior: public endpoints (announcements, shared views)

Requires:  pip install locust
"""

import json
import random
import string
import time

from locust import HttpUser, TaskSet, task, between, events


def _random_email():
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"loadtest_{suffix}@example.com"


DIABETES_PAYLOAD = {
    "glucose": 120.0,
    "blood_pressure": 80.0,
    "weight": 75.0,
    "height": 170.0,
    "age": 35,
    "pregnancies": 0,
    "skin_thickness": 20.0,
    "insulin": 80.0,
    "diabetes_pedigree_function": 0.5,
    "language": "english",
}

HEART_PAYLOAD = {
    "age": 55,
    "sex": 1,
    "cp": 1,
    "trestbps": 130,
    "chol": 250,
    "fbs": 0,
    "restecg": 0,
    "thalach": 150,
    "exang": 0,
    "oldpeak": 1.0,
    "slope": 1,
    "ca": 0,
    "thal": 3,
    "language": "english",
}

CKD_PAYLOAD = {
    "age": 45.0,
    "blood_pressure": 80.0,
    "specific_gravity": 1.020,
    "albumin": 0,
    "sugar": 0,
    "red_blood_cells": 0,
    "pus_cell": 0,
    "pus_cell_clumps": 0,
    "bacteria": 0,
    "blood_glucose_random": 120.0,
    "blood_urea": 25.0,
    "serum_creatinine": 1.0,
    "sodium": 140.0,
    "potassium": 4.5,
    "hemoglobin": 13.0,
    "packed_cell_volume": 40.0,
    "white_blood_cell_count": 7800.0,
    "red_blood_cell_count": 5.0,
    "hypertension": 0,
    "diabetes_mellitus": 0,
    "coronary_artery_disease": 0,
    "appetite": 1,
    "pedal_edema": 0,
    "anemia": 0,
    "language": "english",
}


class UserTasks(TaskSet):
    """Realistic user journey: register, login, run assessments, view history."""

    token: str = ""
    headers: dict = {}

    def on_start(self):
        email = _random_email()
        password = "LoadTestPass1!"
        r = self.client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "full_name": "Load Test User"},
        )
        if r.status_code == 200:
            self.token = r.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            # Try login in case email already registered
            r2 = self.client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password},
            )
            if r2.status_code == 200:
                self.token = r2.json()["access_token"]
                self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def diabetes_assessment(self):
        self.client.post(
            "/api/v1/diabetes-assessment",
            json=DIABETES_PAYLOAD,
            headers=self.headers,
            name="/api/v1/diabetes-assessment",
        )

    @task(2)
    def heart_assessment(self):
        self.client.post(
            "/api/v1/heart-assessment",
            json=HEART_PAYLOAD,
            headers=self.headers,
            name="/api/v1/heart-assessment",
        )

    @task(1)
    def ckd_assessment(self):
        self.client.post(
            "/api/v1/ckd-assessment",
            json=CKD_PAYLOAD,
            headers=self.headers,
            name="/api/v1/ckd-assessment",
        )

    @task(2)
    def view_assessment_history(self):
        self.client.get(
            "/api/v1/users/me/assessments",
            headers=self.headers,
            name="/api/v1/users/me/assessments",
        )

    @task(1)
    def view_profile(self):
        self.client.get(
            "/api/v1/users/me",
            headers=self.headers,
            name="/api/v1/users/me",
        )


class AdminTasks(TaskSet):
    """Admin dashboard flows: login, view stats, list users."""

    headers: dict = {}

    def on_start(self):
        r = self.client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPass123!"},
        )
        if r.status_code == 200:
            token = r.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {token}"}

    @task(2)
    def get_stats(self):
        self.client.get(
            "/api/v1/admin/stats",
            headers=self.headers,
            name="/api/v1/admin/stats",
        )

    @task(1)
    def list_users(self):
        self.client.get(
            "/api/v1/admin/users",
            headers=self.headers,
            name="/api/v1/admin/users",
        )

    @task(1)
    def system_health(self):
        self.client.get(
            "/api/v1/admin/system-health",
            headers=self.headers,
            name="/api/v1/admin/system-health",
        )


class PublicTasks(TaskSet):
    """Read-only public traffic: announcements, shared views."""

    @task(3)
    def active_announcements(self):
        self.client.get(
            "/api/v1/announcements/active",
            name="/api/v1/announcements/active",
        )

    @task(1)
    def maintenance_status(self):
        self.client.get(
            "/api/v1/auth/maintenance-status",
            name="/api/v1/auth/maintenance-status",
        )


class UserBehavior(HttpUser):
    tasks = [UserTasks]
    wait_time = between(1, 3)
    weight = 6


class AdminBehavior(HttpUser):
    tasks = [AdminTasks]
    wait_time = between(2, 5)
    weight = 1


class ReadOnlyBehavior(HttpUser):
    tasks = [PublicTasks]
    wait_time = between(0.5, 2)
    weight = 3
