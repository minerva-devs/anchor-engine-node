#!/usr/bin/env python3
"""
Documentation Map - Where all the docs live in QwenPaw
"""
import os

base = r"C:\Users\rsbii\.qwenpaw"
workspaces = r"C:\Users\rsbii\.qwenpaw\workspaces"

print("=" * 80)
print("QWENPAW DOCUMENTATION MAPPING")
print("=" * 80)

print("\n[ROOT] " + base)
print("-" * 80)
for item in sorted(os.listdir(base)):
    path = os.path.join(base, item)
    if os.path.isdir(path):
        md_files = [f for f in os.listdir(path) if f.endswith('.md')]
        if md_files:
            print(f"  [DIR] {item}/  ({len(md_files)} .md files)")
            for f in md_files:
                print(f"      - {f}")

print("\n" + "=" * 80)
print("[WORKSPACES] " + workspaces)
print("-" * 80)
for item in sorted(os.listdir(workspaces)):
    workspace = os.path.join(workspaces, item)
    if os.path.isdir(workspace):
        print(f"\n[WORKSPACE] {item}")
        md_files = []
        for root, dirs, files in os.walk(workspace):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            for f in files:
                if f.endswith('.md'):
                    rel_path = os.path.relpath(os.path.join(root, f), workspace)
                    md_files.append(rel_path)
        if md_files:
            print(f"    Total .md files: {len(md_files)}")
            for md in md_files[:15]:
                print(f"      - {md}")
            if len(md_files) > 15:
                print(f"      ... and {len(md_files) - 15} more")

print("\n" + "=" * 80)
print("[SUMMARY]")
print("-" * 80)

total_md = 0
for item in sorted(os.listdir(workspaces)):
    workspace = os.path.join(workspaces, item)
    if os.path.isdir(workspace):
        for root, dirs, files in os.walk(workspace):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            count = sum(1 for f in files if f.endswith('.md'))
            total_md += count

print(f"\nTotal .md files across all workspaces: {total_md}")

print("\n[Top 5 Agents with Most Documentation]")
print("-" * 80)
agent_docs = {}
for item in sorted(os.listdir(workspaces)):
    workspace = os.path.join(workspaces, item)
    if os.path.isdir(workspace) and not item.startswith('.'):
        count = 0
        for root, dirs, files in os.walk(workspace):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            count += sum(1 for f in files if f.endswith('.md'))
        if count > 0:
            agent_docs[item] = count

for agent, count in sorted(agent_docs.items(), key=lambda x: -x[1])[:5]:
    print(f"  Files: {count} - {agent}")
