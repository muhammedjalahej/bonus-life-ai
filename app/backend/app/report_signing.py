"""
ECDSA P-256 report signing for tamper-evident assessment reports.
Demo-safe: if REPORT_SIGNING_PRIVATE_KEY_PEM is not set, a key is generated at startup.
Authors: Bonus Life AI
"""

import os
import logging
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

_private_key = None
_public_key_pem = None


def _generate_key():
    """Generate a new ECDSA P-256 key pair (for demo when env not set)."""
    key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    logger.warning(
        "REPORT_SIGNING_PRIVATE_KEY_PEM not set; using auto-generated key. "
        "Set env for production so verification is stable."
    )
    return key, key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")


def _load_key():
    global _private_key, _public_key_pem
    if _private_key is not None:
        return
    pem = os.getenv("REPORT_SIGNING_PRIVATE_KEY_PEM", "").strip()
    if pem:
        try:
            _private_key = serialization.load_pem_private_key(
                pem.encode("utf-8"), password=None, backend=default_backend()
            )
            _public_key_pem = _private_key.public_key().public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            ).decode("utf-8")
            logger.info("Report signing: loaded private key from REPORT_SIGNING_PRIVATE_KEY_PEM")
        except Exception as e:
            logger.error("Failed to load REPORT_SIGNING_PRIVATE_KEY_PEM: %s", e)
            _private_key, _public_key_pem = _generate_key()
    else:
        _private_key, _public_key_pem = _generate_key()


def get_private_key():
    _load_key()
    return _private_key


def get_public_key_pem():
    _load_key()
    return _public_key_pem


def sign_digest(digest_bytes: bytes) -> bytes:
    """Sign a SHA-256 digest (32 bytes) with ECDSA P-256. Returns DER-encoded signature."""
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import utils as asym_utils
    key = get_private_key()
    sig = key.sign(digest_bytes, ec.ECDSA(asym_utils.Prehashed(hashes.SHA256())))
    return sig
