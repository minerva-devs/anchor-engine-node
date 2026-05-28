#!/usr/bin/env python3
"""
Find all documentation files in QwenPaw workspaces
"""
import os
import re
import fnmatch

base = r"C:\Users\rsbii\.qwenpaw\workspaces"

# Files that look like documentation
doc_patterns = [
    'README', 'SETUP', 'INSTALL', 'HOWTO', 'GUIDE', 'MANUAL', 
    'DOC', 'TUTORIAL', 'PROCESSOR', 'MEMORY', 'AGENT', 
    'ARCHITECTURE', 'DESIGN', 'CONCEPT', 'REFERENCE',
    'SYSTEM', 'CONFIG', 'API', 'TOOLS', 'UTILITIES'
]

# Files that are NOT documentation (in-use files)
excluded_patterns = [
    'MEMORY.md', 'PROFILE.md', 'SOUL.md', 'AGENTS.md', 'BOOTSTRAP.md', 
    'HEARTBEAT.md', 'SESSION', 'DIALOG', 'INBOX', 'CHANNEL',
    'BACKUP', 'BACKUP', 'LOG', 'SKILL', 'memory_backup'
]

print("=" * 80)
print("FINDING DOCUMENTATION FILES")
print("=" * 80)

doc_files = []
for root, dirs, files in os.walk(base):
    # Skip hidden directories
    dirs[:] = [d for d in dirs if not d.startswith('.')]
    
    for filename in files:
        # Check if it matches a doc pattern
        is_doc = any(pattern in filename.upper() for pattern in doc_patterns)
        
        # Check if it's excluded (in-use file)
        is_excluded = any(pattern in filename.upper() for pattern in excluded_patterns)
        
        if is_doc and not is_excluded:
            rel_path = os.path.relpath(os.path.join(root, filename), base)
            doc_files.append((rel_path, filename))

# Group by workspace
workspaces = set()
for rel_path, _ in doc_files:
    workspaces.add(rel_path.split(os.sep)[0])

print(f"\nFound {len(doc_files)} documentation files\n")
print("=" * 80)

for workspace in sorted(workspaces):
    ws_files = [(f, n) for f, n in doc_files if f.startswith(workspace + os.sep)]
    if ws_files:
        print(f"\n[WORKSPACE] {workspace}")
        print("-" * 80)
        for rel_path, filename in sorted(ws_files):
            print(f"  {rel_path}")

print("\n" + "=" * 80)
print("\n[RECOMMENDATION]")
print("=" * 80)
print("\nThese files could be consolidated into a central 'docs/' folder:")
for workspace in sorted(workspaces):
    ws_files = [(f, n) for f, n in doc_files if f.startswith(workspace + os.sep)]
    print(f"  {workspace}: {len(ws_files)} files")
