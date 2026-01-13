#!/usr/bin/env python3
"""
Phase Execution Orchestrator for Momento Cake Admin

This script orchestrates the execution of AI handoff phases by spawning
Claude Code sessions and monitoring their progress with robust process management.

Adapted from Spectora mobile project for Next.js + Firebase web project.

Solves the bash timeout/hanging issues by:
1. Using Python's subprocess with proper monitoring
2. Real-time output streaming (no buffering)
3. Proper signal handling and cleanup
4. Heartbeat via thread, not polling loop

Usage:
    python3 orchestrate_execution.py <execution_plan_json> <work_dir> <prd_path> <log_dir>
"""

import sys
import json
import subprocess
import threading
import time
import os
import signal
from datetime import datetime
from pathlib import Path

# Global tracking of active executors for signal cleanup
active_executors = []


class PhaseExecutor:
    """Executes a single phase and monitors its progress."""

    def __init__(self, phase_num, phase_name, phase_prompt, work_dir, prd_path, log_dir):
        self.phase_num = phase_num
        self.phase_name = phase_name
        self.phase_prompt = phase_prompt
        self.work_dir = work_dir
        self.prd_path = prd_path
        self.log_dir = Path(log_dir)
        self.log_file = self.log_dir / f"phase-{phase_num}.log"
        self.status_file = self.log_dir / f"phase-{phase_num}.status"
        self.process = None
        self.start_time = None
        self.max_duration = 90 * 60  # 90 minutes
        self.should_stop = False

    def update_status(self, status):
        """Update status file with current action."""
        self.status_file.write_text(status)
        timestamp = datetime.now().strftime("%H:%M:%S")
        with open(self.log_file, 'a') as f:
            f.write(f"[{timestamp}] {status}\n")

    def check_skip(self):
        """Check if phase should be skipped (manual work required)."""
        skip_keywords = ['documentation', 'monitoring', 'validation', 'manual testing']
        name_lower = self.phase_name.lower()
        prompt_lower = self.phase_prompt.lower()

        # Check if phase name or prompt contains skip keywords
        return any(keyword in name_lower or keyword in prompt_lower for keyword in skip_keywords)

    def execute(self):
        """Execute the phase and return exit code."""
        # Create log directory
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Check if should skip
        if self.check_skip():
            print(f"\n⏭️  Phase {self.phase_num} SKIPPED: {self.phase_name}")
            print(f"   This phase requires manual work, not code implementation\n")
            self.update_status("SKIPPED: Phase requires manual work")
            return 99  # Special exit code for skip

        print(f"\n{'='*60}")
        print(f"Phase {self.phase_num}: {self.phase_name}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Expected duration: 10-30 minutes")
        print(f"{'='*60}\n")

        # Replace PRD path placeholders
        prompt = self.phase_prompt
        prompt = prompt.replace("[path-to-this-prd.md]", self.prd_path)
        prompt = prompt.replace("context/specs/{SCOPE}/PRD.md", self.prd_path)

        # Wrap with /implement
        implement_prompt = f"/implement\n\nTask: {self.phase_name}\n\n{prompt}"

        # Write log header
        with open(self.log_file, 'w') as f:
            f.write(f"=== Phase {self.phase_num}: {self.phase_name} ===\n")
            f.write(f"Start time: {datetime.now()}\n")
            f.write(f"Work directory: {self.work_dir}\n\n")
            f.write(f"Handoff Prompt:\n{prompt}\n\n")
            f.write(f"=== Claude Output ===\n\n")

        self.update_status("Initializing Claude session")

        # Start process with streaming output
        self.start_time = time.time()

        try:
            # Change to work directory
            env = os.environ.copy()

            self.process = subprocess.Popen(
                ['claude', '--dangerously-skip-permissions', implement_prompt],
                cwd=self.work_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,  # Line buffered
                env=env,
                preexec_fn=os.setsid  # Create new process group for proper signal propagation
            )

            # Start heartbeat thread
            heartbeat_thread = threading.Thread(target=self._heartbeat, daemon=True)
            heartbeat_thread.start()

            # Stream output in real-time
            for line in iter(self.process.stdout.readline, ''):
                if self.should_stop:
                    break

                # Write to log
                with open(self.log_file, 'a') as f:
                    f.write(line)

                # Update status based on output patterns
                self._update_status_from_output(line)

                # Print to console
                print(line, end='', flush=True)

            # Wait for completion
            self.process.wait()
            exit_code = self.process.returncode

            # Stop heartbeat
            self.should_stop = True

            # Calculate duration
            duration = int(time.time() - self.start_time)

            # Write completion info
            with open(self.log_file, 'a') as f:
                f.write(f"\n=== Execution Summary ===\n")
                f.write(f"End time: {datetime.now()}\n")
                f.write(f"Duration: {duration}s\n")
                f.write(f"Exit code: {exit_code}\n")

            if exit_code == 0:
                self.update_status("Completed successfully")
                print(f"\n✅ Phase {self.phase_num} completed successfully in {duration}s")
            else:
                self.update_status(f"FAILED (exit code: {exit_code})")
                print(f"\n❌ Phase {self.phase_num} failed with exit code {exit_code}")

            print(f"Log saved to: {self.log_file}\n")
            return exit_code

        except Exception as e:
            self.update_status(f"ERROR: {str(e)}")
            print(f"\n❌ Phase {self.phase_num} error: {e}")
            return 1

    def _heartbeat(self):
        """Heartbeat thread that outputs progress every 60 seconds."""
        last_heartbeat = time.time()

        while not self.should_stop and self.process and self.process.poll() is None:
            time.sleep(1)  # Check every second

            current_time = time.time()
            elapsed = int(current_time - self.start_time)
            minutes = elapsed // 60

            # Check timeout
            if elapsed > self.max_duration:
                print(f"\n⏰ TIMEOUT: Phase {self.phase_num} exceeded {self.max_duration // 60} minutes")
                print("   Terminating process...\n")
                self._terminate()
                break

            # Heartbeat output every 60 seconds
            if current_time - last_heartbeat >= 60:
                status = self.status_file.read_text() if self.status_file.exists() else "Running..."
                print(f"\n⏱️  Phase {self.phase_num} still running... ({minutes}m elapsed) - {datetime.now().strftime('%H:%M:%S')}")
                print(f"   Current action: {status[:80]}\n", flush=True)
                last_heartbeat = current_time

    def _update_status_from_output(self, line):
        """Update status based on output patterns."""
        line_lower = line.lower()

        # Web-specific patterns
        if any(keyword in line_lower for keyword in ['writing', 'creating', 'implementing']):
            self.update_status(f"Writing code: {line[:80]}")
        elif any(keyword in line_lower for keyword in ['testing', 'running test', 'npm run test']):
            self.update_status(f"Running tests: {line[:80]}")
        elif any(keyword in line_lower for keyword in ['reading', 'analyzing']):
            self.update_status(f"Analyzing code: {line[:80]}")
        elif any(keyword in line_lower for keyword in ['building', 'compiling', 'npm run build']):
            self.update_status(f"Building: {line[:80]}")
        elif any(keyword in line_lower for keyword in ['linting', 'npm run lint']):
            self.update_status(f"Linting: {line[:80]}")
        elif any(keyword in line_lower for keyword in ['completed', 'done', 'success', '✅']):
            self.update_status(f"Finalizing: {line[:80]}")

    def _terminate(self):
        """Terminate the process and its children gracefully."""
        if self.process and self.process.poll() is None:
            try:
                # Kill entire process group (includes child processes)
                os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill entire process group
                try:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                    self.process.wait()
                except ProcessLookupError:
                    pass  # Process already dead
            except ProcessLookupError:
                pass  # Process already dead
            self.should_stop = True


def execute_sequential(phases, work_dir, prd_path, log_dir):
    """Execute phases sequentially."""
    results = []

    for phase in phases:
        executor = PhaseExecutor(
            phase['number'],
            phase['name'],
            phase['prompt'],
            work_dir,
            prd_path,
            log_dir
        )

        # Track active executor for signal cleanup
        active_executors.append(executor)

        try:
            exit_code = executor.execute()
            results.append({
                'phase': phase['number'],
                'name': phase['name'],
                'exit_code': exit_code
            })

            # Stop on failure
            if exit_code not in [0, 99]:
                print(f"\n❌ Stopping execution due to phase {phase['number']} failure\n")
                return False, results
        finally:
            # Remove from active tracking
            if executor in active_executors:
                active_executors.remove(executor)

    return True, results


def execute_parallel(phases, work_dir, prd_path, log_dir):
    """Execute phases in parallel."""
    print(f"\n🚀 Launching {len(phases)} parallel phases...\n")

    executors = []
    threads = []

    # Start all phases
    for phase in phases:
        executor = PhaseExecutor(
            phase['number'],
            phase['name'],
            phase['prompt'],
            work_dir,
            prd_path,
            log_dir
        )
        executors.append(executor)

        # Track active executor for signal cleanup
        active_executors.append(executor)

        thread = threading.Thread(target=lambda e: e.execute(), args=(executor,))
        thread.start()
        threads.append(thread)

    print(f"⏳ Monitoring {len(phases)} parallel phases...\n")

    try:
        # Wait for all to complete
        for thread in threads:
            thread.join()
    finally:
        # Remove all from active tracking
        for executor in executors:
            if executor in active_executors:
                active_executors.remove(executor)

    # Collect results
    results = []
    failed = False
    skipped = 0

    for executor in executors:
        # Read exit code from log (since thread finished)
        # For simplicity, check if status says FAILED or SKIPPED
        if executor.status_file.exists():
            status = executor.status_file.read_text()
            if 'SKIPPED' in status:
                exit_code = 99
                skipped += 1
            elif 'FAILED' in status:
                exit_code = 1
                failed = True
            else:
                exit_code = 0
        else:
            exit_code = 1
            failed = True

        results.append({
            'phase': executor.phase_num,
            'name': executor.phase_name,
            'exit_code': exit_code
        })

        if exit_code == 99:
            print(f"⏭️  Phase {executor.phase_num} SKIPPED")
        elif exit_code == 0:
            print(f"✅ Phase {executor.phase_num} completed successfully")
        else:
            print(f"❌ Phase {executor.phase_num} failed")

    if skipped > 0:
        print(f"\n✅ All parallel phases completed ({skipped} skipped)\n")
    else:
        print(f"\n✅ All parallel phases completed\n")

    return not failed, results


def signal_handler(signum, frame):
    """Handle termination signals by cleaning up child processes."""
    signal_name = "SIGTERM" if signum == signal.SIGTERM else "SIGINT"
    print(f"\n\n⚠️  Received {signal_name}, cleaning up child processes...\n")

    # Terminate all active executors
    for executor in active_executors[:]:  # Copy list to avoid modification during iteration
        print(f"   Terminating Phase {executor.phase_num}...")
        executor._terminate()

    print("\n✅ Cleanup complete\n")
    sys.exit(1)


def main():
    if len(sys.argv) != 5:
        print("Usage: python3 orchestrate_execution.py <execution_plan_json> <work_dir> <prd_path> <log_dir>")
        sys.exit(1)

    # Register signal handlers for graceful cleanup
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    execution_plan_path = sys.argv[1]
    work_dir = sys.argv[2]
    prd_path = sys.argv[3]
    log_dir = sys.argv[4]

    # Load execution plan
    with open(execution_plan_path, 'r') as f:
        execution_plan = json.load(f)

    execution_groups = execution_plan.get('execution_groups', [])
    phases = {p['number']: p for p in execution_plan['phases']}

    print(f"\n{'='*60}")
    print(f"Executing {len(execution_plan['phases'])} phases in {len(execution_groups)} groups")
    print(f"{'='*60}\n")

    all_results = []

    # Execute each group
    for group_num, group_phase_nums in enumerate(execution_groups, 1):
        group_phases = [phases[num] for num in group_phase_nums]

        print(f"\n{'='*60}")
        print(f"Execution Group {group_num}")
        print(f"{'='*60}\n")

        if len(group_phases) == 1:
            # Sequential
            success, results = execute_sequential(group_phases, work_dir, prd_path, log_dir)
        else:
            # Parallel
            success, results = execute_parallel(group_phases, work_dir, prd_path, log_dir)

        all_results.extend(results)

        if not success:
            print("\n❌ Execution failed\n")
            sys.exit(1)

    print(f"\n{'='*60}")
    print("All phases completed successfully!")
    print(f"{'='*60}\n")

    # Print summary
    print("Execution Summary:")
    for result in all_results:
        status = "✅ SUCCESS" if result['exit_code'] == 0 else ("⏭️  SKIPPED" if result['exit_code'] == 99 else "❌ FAILED")
        print(f"  Phase {result['phase']}: {result['name']} - {status}")

    sys.exit(0)


if __name__ == "__main__":
    main()
