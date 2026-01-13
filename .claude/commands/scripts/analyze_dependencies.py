#!/usr/bin/env python3
"""
Dependency Analyzer for AI Handoff Phases

This script analyzes phase dependencies from ai-handoff.json and generates
an execution plan that groups independent phases for parallel execution.

Usage:
    python3 analyze_dependencies.py <ai_handoff_json> <output_plan_json>
"""

import sys
import json
from collections import defaultdict, deque


def build_dependency_graph(phases):
    """Build dependency graph from phases."""
    graph = defaultdict(list)  # phase_num -> [dependent_phase_nums]
    reverse_graph = defaultdict(list)  # phase_num -> [dependency_phase_nums]

    for phase in phases:
        phase_num = phase['number']
        dependencies = phase.get('dependencies', [])

        reverse_graph[phase_num] = dependencies

        for dep in dependencies:
            graph[dep].append(phase_num)

    return graph, reverse_graph


def topological_sort_with_groups(phases):
    """
    Perform topological sort with grouping for parallel execution.
    Returns groups of phases where phases in the same group can run in parallel.
    """
    graph, reverse_graph = build_dependency_graph(phases)
    phase_nums = [p['number'] for p in phases]

    # Calculate in-degree for each phase
    in_degree = {num: len(reverse_graph[num]) for num in phase_nums}

    # Initialize queue with phases that have no dependencies
    queue = deque([num for num in phase_nums if in_degree[num] == 0])

    execution_groups = []
    visited = set()

    while queue:
        # All phases currently in queue can run in parallel
        current_group = list(queue)
        execution_groups.append(current_group)

        # Clear queue for next iteration
        queue.clear()

        # Process current group
        for phase_num in current_group:
            visited.add(phase_num)

            # Reduce in-degree for dependent phases
            for dependent in graph[phase_num]:
                in_degree[dependent] -= 1

                # If all dependencies satisfied, add to queue
                if in_degree[dependent] == 0:
                    queue.append(dependent)

    # Check for cycles
    if len(visited) != len(phase_nums):
        unvisited = set(phase_nums) - visited
        raise ValueError(f"Circular dependency detected. Unvisited phases: {unvisited}")

    return execution_groups


def generate_execution_plan(ai_handoff_path, output_path):
    """Generate execution plan from ai-handoff.json."""
    # Load ai-handoff.json
    with open(ai_handoff_path, 'r') as f:
        handoff_data = json.load(f)

    phases = handoff_data['phases']
    scope = handoff_data['scope']
    title = handoff_data['title']

    print(f"Analyzing {len(phases)} phases for scope: {scope}")
    print()

    # Analyze dependencies and create execution groups
    execution_groups = topological_sort_with_groups(phases)

    print(f"Execution Plan:")
    print(f"  Total phases: {len(phases)}")
    print(f"  Execution groups: {len(execution_groups)}")
    print()

    for i, group in enumerate(execution_groups, 1):
        parallel = len(group) > 1
        print(f"  Group {i} ({'parallel' if parallel else 'sequential'}):")
        for phase_num in group:
            phase = next(p for p in phases if p['number'] == phase_num)
            deps = phase.get('dependencies', [])
            deps_str = f" (deps: {deps})" if deps else ""
            print(f"    - Phase {phase_num}: {phase['name']}{deps_str}")
        print()

    # Create execution plan
    execution_plan = {
        'scope': scope,
        'title': title,
        'phases': phases,
        'execution_groups': execution_groups
    }

    # Write execution plan
    with open(output_path, 'w') as f:
        json.dump(execution_plan, f, indent=2)

    print(f"✓ Execution plan saved to: {output_path}")


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 analyze_dependencies.py <ai_handoff_json> <output_plan_json>")
        sys.exit(1)

    ai_handoff_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        generate_execution_plan(ai_handoff_path, output_path)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
