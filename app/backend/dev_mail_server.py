"""
Local dev SMTP server on port 1025. Receives "forgot password" emails and prints the reset link.
Run in a separate terminal: python dev_mail_server.py
Then use Forgot password in the app; the reset link will appear here and in mail_output/*.eml
"""
import os
import re
import sys
from datetime import datetime

# Try stdlib smtpd first (Python < 3.12)
try:
    import smtpd
    import asyncore
    HAS_SMTPD = True
except ImportError:
    HAS_SMTPD = False

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "mail_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def extract_reset_link(data: str) -> str | None:
    m = re.search(r"https?://[^\s]+/reset-password\?token=[^\s\)\]\"]+", data)
    return m.group(0).rstrip(".,;:)") if m else None


def process_message(peer, mailfrom, rcpttos, data: str):
    link = extract_reset_link(data)
    if link:
        print("\n" + "=" * 60)
        print("PASSWORD RESET LINK (copy and open in browser):")
        print(link)
        print("=" * 60 + "\n")
    filename = os.path.join(OUTPUT_DIR, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.eml")
    with open(filename, "wb") as f:
        f.write(data.encode("utf-8", errors="replace"))
    print(f"Email saved to {filename}")


if HAS_SMTPD:
    class DevMailHandler(smtpd.SMTPServer):
        def process_message(self, peer, mailfrom, rcpttos, data, **kwargs):
            if isinstance(data, bytes):
                data = data.decode("utf-8", errors="replace")
            process_message(peer, mailfrom, rcpttos, data)

    def run():
        server = DevMailHandler(("127.0.0.1", 1025), None)
        print("Dev mail server on 127.0.0.1:1025 (no auth). Receiving...")
        print("Use Forgot password in the app; reset link will appear below.\n")
        try:
            asyncore.loop()
        except KeyboardInterrupt:
            print("\nStopped.")
else:
    # Python 3.12+: minimal SMTP receiver (smtpd removed from stdlib)
    import socket

    def run():
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("127.0.0.1", 1025))
        sock.listen(5)
        print("Dev mail server on 127.0.0.1:1025 (no auth). Receiving...")
        print("Use Forgot password in the app; reset link will appear below.\n")
        try:
            while True:
                conn, _ = sock.accept()
                try:
                    def send(line):
                        conn.sendall((line + "\r\n").encode())

                    send("220 localhost ESMTP")
                    buf = b""
                    in_data = False
                    while True:
                        buf += conn.recv(4096)
                        if not buf:
                            break
                        if in_data:
                            if b"\r\n.\r\n" in buf:
                                idx = buf.index(b"\r\n.\r\n")
                                msg = buf[:idx].decode("utf-8", errors="replace")
                                send("250 OK")
                                process_message(None, None, [], msg)
                                break
                            elif b"\n.\n" in buf:
                                idx = buf.index(b"\n.\n")
                                msg = buf[:idx].decode("utf-8", errors="replace")
                                send("250 OK")
                                process_message(None, None, [], msg)
                                break
                            continue
                        while b"\r\n" in buf:
                            line, _, buf = buf.partition(b"\r\n")
                            line = line.decode("utf-8", errors="replace").strip().upper()
                            if line == "QUIT":
                                send("221 Bye")
                                break
                            if line.startswith("DATA"):
                                send("354 Go ahead")
                                in_data = True
                                break
                            else:
                                send("250 OK")
                        else:
                            if in_data:
                                continue
                            if buf and buf.strip().upper().startswith(b"QUIT"):
                                send("221 Bye")
                                break
                except Exception as e:
                    print("Error:", e)
                finally:
                    conn.close()
        except KeyboardInterrupt:
            print("\nStopped.")
        finally:
            sock.close()


if __name__ == "__main__":
    run()
    sys.exit(0)
