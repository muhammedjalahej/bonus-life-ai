"""Set a user as admin by email. Run from app/backend: python backend_scripts/make_admin.py user@example.com"""
import sys
import os

# Ensure app is importable when run from backend_scripts (add backend dir to path)
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _backend_dir)

from app.database import SessionLocal
from app.db_models import User

def main():
    if len(sys.argv) < 2:
        print("Usage: python backend_scripts/make_admin.py <email>")
        print("Example: python backend_scripts/make_admin.py user@example.com")
        sys.exit(1)
    email = sys.argv[1].strip().lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"No user found with email: {email}")
            sys.exit(1)
        user.role = "admin"
        db.commit()
        print(f"Done. {email} is now an admin. Log in with the Admin toggle.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
