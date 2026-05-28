#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Multi-Agent Session Log Processor v3.0

Scans ALL agent workspaces for session logs, processes new/changed files,
and maintains a central tracking database to prevent duplication.

Author: Memory Manager Agent (MM1)
Version: 3.0 - Updated for actual session log format
Last Updated: 2026-05-25
"""

import os
import sys
import json
from datetime import datetime
import hashlib

# Set up console encoding for Windows
if sys.platform.startswith('win'):
    try:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    except:
        pass

# =============================================================================
# CONFIGURATION
# =============================================================================

BASE_DIR = r"C:\Users\rsbii\.qwenpaw\workspaces"
TRACKER_FILE = os.path.join(BASE_DIR, "MM1", ".session_tracker.md")
MEMORY_OUTPUT = r"C:\Users\rsbii\.qwenpaw\workspaces\default\.qwenpaw\memory\MEMORY.md"

SESSION_DIRS = ["sessions", "inbox_traces", "agent.memory.content", "dialog"]
FILE_EXTS = [".json", ".jsonl"]

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_all_agents():
    """Scan the workspaces directory for all agent workspace directories."""
    agents = []
    if not os.path.exists(BASE_DIR):
        return agents
    
    for item in os.listdir(BASE_DIR):
        workspace_path = os.path.join(BASE_DIR, item)
        if os.path.isdir(workspace_path) and item not in ["QwenPaw_QA_Agent_0.2", "ResearchAgent", "inventory_bot", "AEN-0", "Job-Search-Agent"]:
            agents.append({"id": item, "path": workspace_path, "workspace_name": item})
    
    # Always include MM1 and default
    for agent_id in ["MM1", "default"]:
        agent_path = os.path.join(BASE_DIR, agent_id)
        if os.path.isdir(agent_path) and agent_id not in [a["id"] for a in agents]:
            agents.append({"id": agent_id, "path": agent_path, "workspace_name": f"{agent_id} Agent"})
    
    return agents

def find_session_files(agent_path):
    """Find all session log files in an agent's workspace."""
    files = []
    for root, dirs, filenames in os.walk(agent_path):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['__pycache__', '.skill.json.lock']]
        for filename in filenames:
            if any(filename.lower().endswith(ext) for ext in FILE_EXTS):
                file_path = os.path.join(root, filename)
                is_session_file = any(session_dir.lower() in root.lower() for session_dir in SESSION_DIRS)
                if is_session_file:
                    files.append(file_path)
    return files

def compute_file_hash(filepath):
    """Compute a hash of the file to detect changes."""
    try:
        with open(filepath, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except:
        return None

def load_tracker():
    """Load the tracking database."""
    if not os.path.exists(TRACKER_FILE):
        return {"processed_files": {}, "last_run": None, "total_files": 0}
    try:
        with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        start_marker = "## 📋 Master Log\n\n*This section is auto-generated. Do not modify.*"
        if start_marker in content:
            master_log_start = content.find(start_marker) + len(start_marker)
            while master_log_start < len(content) and content[master_log_start] != "\n":
                master_log_start += 1
            return json.loads(content[master_log_start:].strip())
    except:
        pass
    return {"processed_files": {}, "last_run": None, "total_files": 0}

def save_tracker(tracker_data):
    """Save the tracking database."""
    try:
        with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        start_marker = "## 📋 Master Log\n\n*This section is auto-generated. Do not modify.*"
        if start_marker in content:
            master_log_start = content.find(start_marker) + len(start_marker)
            while master_log_start > 0 and content[master_log_start] != "\n":
                master_log_start += 1
            master_log_end = master_log_start
        else:
            master_log_end = len(content)
        new_content = content[:master_log_end] + json.dumps(tracker_data, indent=2) + "\n"
        with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
            f.write(new_content)
    except Exception as e:
        print(f"[ERROR] Could not save tracker: {e}")

def update_memory_md(event_chains, source_info):
    """Append event chains to the central MEMORY.md file."""
    try:
        if os.path.exists(MEMORY_OUTPUT):
            with open(MEMORY_OUTPUT, 'r', encoding='utf-8') as f:
                existing_content = f.read()
        else:
            existing_content = ""
        
        new_chain = {
            "id": datetime.now().strftime("%Y%m%d%H%M%S_%f")[:26],
            "timestamp": datetime.now().isoformat(),
            "source": source_info,
            "event_count": len(event_chains),
            "chains": event_chains
        }
        
        new_content = existing_content.rstrip() + "\n\n" + json.dumps(new_chain, indent=2) + "\n\n"
        with open(MEMORY_OUTPUT, 'w', encoding='utf-8') as f:
            f.write(new_content)
    except Exception as e:
        print(f"[ERROR] Could not update MEMORY.md: {e}")

def extract_events_from_session_file(filepath):
    """Extract events from a session file with the correct nested structure."""
    event_chains = []
    relative_path = os.path.relpath(filepath, BASE_DIR)
    agent_id = relative_path.split(os.sep)[0]
    
    try:
        with open(filepath, 'r', encoding='charmap', errors='ignore') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print(f"[WARNING] Invalid JSON in: {filepath}")
        return []
    except Exception as e:
        print(f"[WARNING] Could not read file {filepath}: {e}")
        return []
    
    # Handle different session file formats
    if isinstance(data, dict):
        # Format 1: Agent state snapshot files
        if "agent" in data:
            agent_data = data["agent"]
            if "memory" in agent_data and "content" in agent_data["memory"]:
                content_array = agent_data["memory"]["content"]
                # Each item is [conversation, tool_calls]
                for content_item in content_array:
                    if isinstance(content_item, list) and len(content_item) >= 2:
                        # conversation part (index 0) and tool part (index 1)
                        conversation = content_item[0] if isinstance(content_item[0], dict) else {}
                        tool_part = content_item[1] if isinstance(content_item[1], list) else []
                        
                        # Extract timestamp from conversation if available
                        timestamp = None
                        if isinstance(conversation, dict) and "timestamp" in conversation:
                            timestamp = conversation["timestamp"]
                        elif isinstance(conversation, list) and len(conversation) > 0:
                            first_msg = conversation[0] if isinstance(conversation[0], dict) else {}
                            if "timestamp" in first_msg:
                                timestamp = first_msg["timestamp"]
                        
                        # Extract events from tool_part (index 1)
                        for tool in tool_part:
                            if isinstance(tool, dict) and "id" in tool:
                                event = {
                                    "id": tool.get("id", hashlib.md5(str(tool).encode()).hexdigest()[:12]),
                                    "timestamp": timestamp or datetime.now().isoformat(),
                                    "type": tool.get("type", "tool_call"),
                                    "agent": agent_id,
                                    "source_file": relative_path,
                                    "payload": tool.get("payload", tool.get("content", {}))
                                }
                                event_chains.append(event)
        
        # Format 2: Inbox traces format
        elif "events" in data:
            for event in data["events"]:
                if isinstance(event, dict) and "id" in event:
                    event_chains.append({
                        "id": event.get("id", hashlib.md5(str(event).encode()).hexdigest()[:12]),
                        "timestamp": event.get("timestamp", datetime.now().isoformat()),
                        "type": event.get("type", "unknown"),
                        "agent": agent_id,
                        "source_file": relative_path,
                        "payload": event.get("payload", {})
                    })
    
    elif isinstance(data, list):
        # Array format - treat each item as a potential event
        for item in data:
            if isinstance(item, dict) and "id" in item:
                event_chains.append({
                    "id": item.get("id", hashlib.md5(str(item).encode()).hexdigest()[:12]),
                    "timestamp": item.get("timestamp", datetime.now().isoformat()),
                    "type": item.get("type", "unknown"),
                    "agent": agent_id,
                    "source_file": relative_path,
                    "payload": item.get("payload", {})
                })
    
    return event_chains

def main():
    now = datetime.now()
    run_id = now.strftime("%Y%m%d%H%M%S")
    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S America/Denver")
    
    print("\n" + "=" * 70)
    print("MULTI-AGENT SESSION LOG PROCESSOR v3.0")
    print("=" * 70)
    print(f"\nRun ID: {run_id}")
    print(f"Time:   {timestamp_str}")
    
    tracker_data = load_tracker()
    total_tracked = tracker_data.get('total_files', 0)
    print(f"Loaded tracker: {total_tracked} files previously tracked")
    
    agents = get_all_agents()
    print(f"Scanning {len(agents)} agent workspaces...\n")
    
    all_event_chains = []
    new_files_processed = 0
    total_files_scanned = 0
    skipped_files = 0
    
    for agent in agents:
        print(f"Processing agent: {agent['workspace_name']} ({agent['id']})")
        session_files = find_session_files(agent['path'])
        print(f"   Found {len(session_files)} potential session files")
        
        for file_path in session_files:
            total_files_scanned += 1
            file_hash = compute_file_hash(file_path)
            
            if not file_hash:
                skipped_files += 1
                continue
            
            file_key = f"{agent['id']}:{file_path}"
            if file_hash in tracker_data.get("processed_files", {}).get("hashes", {}):
                print(f"   [SKIP] Already processed: {os.path.basename(file_path)}")
                skipped_files += 1
                continue
            
            print(f"   [PROCESS] {os.path.basename(file_path)}")
            event_chains = extract_events_from_session_file(file_path)
            
            if event_chains:
                all_event_chains.extend(event_chains)
                new_files_processed += 1
                print(f"   [OK] Extracted {len(event_chains)} event chains")
    
    print("\n" + "=" * 70)
    print("PROCESSING SUMMARY")
    print("=" * 70)
    print(f"Total files scanned:     {total_files_scanned}")
    print(f"New files processed:     {new_files_processed}")
    print(f"Previously processed:     {skipped_files}")
    print(f"Total event chains:      {len(all_event_chains)}")
    
    # Update tracker
    tracker_data["processed_files"]["hashes"] = tracker_data.get("processed_files", {}).get("hashes", {})
    for agent in agents:
        for file_path in find_session_files(agent['path']):
            file_hash = compute_file_hash(file_path)
            if file_hash:
                key = f"{agent['id']}:{file_path}"
                tracker_data["processed_files"]["hashes"][key] = {
                    "hash": file_hash,
                    "last_processed": now.isoformat()
                }
    
    tracker_data["last_run"] = {"run_id": run_id, "timestamp": timestamp_str}
    tracker_data["total_files"] = total_files_scanned
    tracker_data["event_chains"] = len(all_event_chains)
    save_tracker(tracker_data)
    print(f"\nTracker updated with {total_files_scanned} files")
    
    if all_event_chains:
        source_info = {
            "run_id": run_id,
            "timestamp": timestamp_str,
            "agents_processed": [agent['id'] for agent in agents],
            "total_chains": len(all_event_chains)
        }
        update_memory_md(all_event_chains, source_info)
        print(f"Event chains written to central MEMORY.md")
    else:
        print("No new event chains to write")
    
    print("\n" + "=" * 70)
    print("PROCESSING COMPLETE")
    print(f"   Run ID: {run_id} | Time: {timestamp_str}")
    print("=" * 70)

if __name__ == "__main__":
    main()
