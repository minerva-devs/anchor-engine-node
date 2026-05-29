#!/usr/bin/env python3
"""
Anchor Engine Server Wrapper

A simple Python wrapper to manage the Anchor Engine lifecycle.
Provides a clean API for starting and stopping the engine.
"""

import subprocess
import sys
import os
import signal
from pathlib import Path

# Get the project root directory (go up two levels from scripts/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

ENGINE_PID_FILE = PROJECT_ROOT / ".anchor" / "engine.pid"


def start_engine():
    """Start the Anchor Engine with full logging."""
    print("=" * 60)
    print("Anchor Engine Server Wrapper")
    print("=" * 60)
    
    # Step 1: Install dependencies if needed
    print("\n[1/3] Checking dependencies...")
    result = subprocess.run(
        ["pnpm", "install", "--no-optional"],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print("[OK] Dependencies installed")
    else:
        print(f"[WARN] pnpm install completed with code {result.returncode}")
    
    # Step 2: Build the engine
    print("\n[2/3] Building engine...")
    result = subprocess.run(
        ["pnpm", "run", "build"],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print("[OK] Build complete")
    else:
        print(f"[WARN] Build completed with code {result.returncode}")
    
    # Step 3: Start the engine
    print("\n[3/3] Starting Anchor Engine...")
    
    # Clear or create PID file
    ENGINE_PID_FILE.parent.mkdir(parents=True, exist_ok=True)
    if ENGINE_PID_FILE.exists():
        ENGINE_PID_FILE.unlink()
    
    # Start the engine process
    result = subprocess.run(
        ["pnpm", "start-with-logging"],
        cwd=PROJECT_ROOT,
        capture_output=False,
        text=True,
        shell=True
    )
    
    # Save PID for cleanup
    pid = os.getpid() if os.name == 'nt' else result.returncode  # Simplified for Windows
    
    print("\n" + "=" * 60)
    print("Anchor Engine started successfully!")
    print("=" * 60)
    print(f"Server running on http://localhost:3160")
    print(f"PID file: {ENGINE_PID_FILE}")
    
    return pid


def stop_engine():
    """Stop the Anchor Engine gracefully."""
    print("=" * 60)
    print("Anchor Engine Server Wrapper")
    print("=" * 60)
    
    # Check if engine is running
    import socket
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', 3160))
        if result == 0:
            print("[OK] Engine detected on port 3160")
            sock.close()
            
            # Try to find and kill the process
            import psutil
            for proc in psutil.process_iter():
                try:
                    if proc.name() and 'node' in proc.name().lower():
                        print(f"[INFO] Found Node.js process: {proc.pid}")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            # Kill processes on port 3160
            for conn in psutil.net_connections(kind='inet'):
                if '3160' in str(conn.addr):
                    print(f"[INFO] Found connection on port 3160, PID: {conn.pid}")
                    try:
                        os.kill(conn.pid, signal.SIGTERM)
                        print(f"[OK] Stopped process {conn.pid}")
                    except (OSError, ProcessLookupError):
                        pass
            
            print("\n" + "=" * 60)
            print("Anchor Engine shutdown complete")
            print("=" * 60)
        else:
            print("[INFO] No engine running on port 3160")
            print("=" * 60)
    except Exception as e:
        print(f"[ERROR] {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python engine_server.py start   - Start the Anchor Engine")
        print("  python engine_server.py stop    - Stop the running Anchor Engine")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "start":
        start_engine()
    elif command == "stop":
        stop_engine()
    else:
        print(f"Unknown command: {command}")
        print("Use 'start' or 'stop'")
        sys.exit(1)