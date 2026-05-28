import subprocess
import os

script_dir = "C:\\Users\\rsbii\\.qwenpaw\\workspaces\\MM1"
batch_file = f"{script_dir}run_memory_processor.bat"

print("Setting up Memory Manager Scheduled Task...")

# Run PowerShell command to create the scheduled task
powershell_script = f'''
$taskName = "Memory Manager Session Processor"
$batFile = "{batch_file}"
$userId = "$(whoami)"

# Remove existing task if it exists
try {{
    Unregister-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
}} catch {{}}

# Create the scheduled task
Register-ScheduledTask `
    -TaskName $taskName `
    -Action (New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/C {batch_file}") `
    -Trigger (New-ScheduledTaskTrigger -Daily -At 06:30 -RepetitionInterval (New-TimeSpan -Hours 12) -StartBoundary (Get-Date -Format "yyyy-MM-dd 06:30:00")) `
    -RunLevel Highest `
    -User $userId `
    -Description "Processes session logs from all agents, extracts event chains, and maintains central memory database."

Write-Host "✅ Scheduled task created successfully!"
Write-Host "📅 Morning: 6:30 AM daily"
Write-Host "🌙 Night:   6:30 PM daily"
Write-Host ""
Write-Host "To view the task, run in PowerShell:"
Write-Host "  Get-ScheduledTask -TaskName 'Memory Manager Session Processor' | Format-List"
'''

# Execute the PowerShell script
result = subprocess.run(['powershell', '-ExecutionPolicy', 'Bypass', '-Command', powershell_script], 
                       capture_output=True, text=True)

print("PowerShell output:")
print(result.stdout)

if result.returncode != 0:
    print("\nErrors:")
    print(result.stderr)
    print("\n⚠️  PowerShell command failed. Try running manually:")
    print(f"  powershell -ExecutionPolicy Bypass -File {batch_file.replace('.bat', '_setup.ps1')}")
