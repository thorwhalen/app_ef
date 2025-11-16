#!/usr/bin/env python3
"""
Validation script for app_ef structure and syntax
"""

import os
import py_compile
import json
from pathlib import Path

def validate_python_syntax(file_path):
    """Check if a Python file has valid syntax"""
    try:
        py_compile.compile(file_path, doraise=True)
        return True, None
    except py_compile.PyCompileError as e:
        return False, str(e)

def validate_json_syntax(file_path):
    """Check if a JSON file is valid"""
    try:
        with open(file_path, 'r') as f:
            json.load(f)
        return True, None
    except json.JSONDecodeError as e:
        return False, str(e)

def check_file_exists(file_path):
    """Check if a file exists"""
    return Path(file_path).exists()

def main():
    print("=" * 60)
    print("app_ef Structure Validation")
    print("=" * 60)

    # Critical files to check
    critical_files = {
        "Backend Files": [
            "backend/app/main.py",
            "backend/app/core/config.py",
            "backend/app/core/storage.py",
            "backend/app/core/ef_wrapper.py",
            "backend/app/core/auth.py",
            "backend/app/api/v1/projects.py",
            "backend/app/api/v1/sources.py",
            "backend/app/api/v1/components.py",
            "backend/app/api/v1/pipelines.py",
            "backend/app/api/v1/results.py",
            "backend/app/api/v1/auth.py",
            "backend/app/api/websockets.py",
        ],
        "Frontend Files": [
            "frontend/src/App.tsx",
            "frontend/src/main.tsx",
            "frontend/src/services/api.ts",
            "frontend/src/hooks/useProjects.ts",
            "frontend/src/hooks/useSources.ts",
            "frontend/src/hooks/usePipelines.ts",
            "frontend/src/hooks/useResults.ts",
            "frontend/src/components/ProjectsSection.tsx",
            "frontend/src/components/SourcesSection.tsx",
            "frontend/src/components/PipelinesSection.tsx",
            "frontend/src/components/ResultsSection.tsx",
            "frontend/src/components/SimpleScatterPlot.tsx",
        ],
        "Test Files": [
            "backend/tests/test_projects.py",
            "backend/tests/test_sources.py",
            "backend/tests/test_components.py",
            "backend/tests/test_pipelines.py",
            "backend/tests/test_results.py",
            "backend/tests/test_integration.py",
            "backend/tests/test_auth.py",
        ],
        "Documentation": [
            "IMPLEMENTATION_PLAN.md",
            "TECHNICAL_ARCHITECTURE.md",
            "DEVELOPMENT_ROADMAP.md",
            "QUICKSTART.md",
            "API_DOCUMENTATION.md",
            "USER_GUIDE.md",
            "DEPLOYMENT_GUIDE.md",
            "RELEASE_NOTES.md",
        ],
        "Configuration": [
            "backend/requirements.txt",
            "backend/Dockerfile",
            "frontend/package.json",
            "frontend/Dockerfile",
            "docker-compose.yml",
        ],
    }

    all_passed = True
    total_files = 0
    passed_files = 0

    print("\n📁 File Structure Check")
    print("-" * 60)

    for category, files in critical_files.items():
        print(f"\n{category}:")
        for file_path in files:
            total_files += 1
            exists = check_file_exists(file_path)
            status = "✓" if exists else "✗"
            print(f"  {status} {file_path}")
            if exists:
                passed_files += 1
            else:
                all_passed = False

    print(f"\nFile Check: {passed_files}/{total_files} files found")

    # Validate Python syntax
    print("\n🐍 Python Syntax Validation")
    print("-" * 60)

    python_files = []
    for root, dirs, files in os.walk("backend"):
        # Skip __pycache__ and venv
        dirs[:] = [d for d in dirs if d not in ['__pycache__', 'venv', '.pytest_cache']]
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))

    syntax_passed = 0
    syntax_failed = 0

    for py_file in python_files:
        valid, error = validate_python_syntax(py_file)
        if valid:
            syntax_passed += 1
            print(f"  ✓ {py_file}")
        else:
            syntax_failed += 1
            print(f"  ✗ {py_file}")
            print(f"    Error: {error}")
            all_passed = False

    print(f"\nSyntax Check: {syntax_passed}/{syntax_passed + syntax_failed} files passed")

    # Validate JSON files
    print("\n📄 JSON Validation")
    print("-" * 60)

    json_files = [
        "frontend/package.json",
        "frontend/tsconfig.json",
        "frontend/tsconfig.node.json",
    ]

    json_passed = 0
    json_failed = 0

    for json_file in json_files:
        if check_file_exists(json_file):
            valid, error = validate_json_syntax(json_file)
            if valid:
                json_passed += 1
                print(f"  ✓ {json_file}")
            else:
                json_failed += 1
                print(f"  ✗ {json_file}")
                print(f"    Error: {error}")
                all_passed = False
        else:
            print(f"  - {json_file} (not found, skipping)")

    print(f"\nJSON Check: {json_passed}/{json_passed + json_failed} files passed")

    # Count lines of code
    print("\n📊 Code Statistics")
    print("-" * 60)

    stats = {
        "Python files": 0,
        "Python lines": 0,
        "TypeScript files": 0,
        "TypeScript lines": 0,
        "Test files": 0,
        "Test lines": 0,
        "Documentation lines": 0,
    }

    # Count Python files
    for py_file in python_files:
        with open(py_file, 'r') as f:
            lines = len(f.readlines())
            stats["Python lines"] += lines
            stats["Python files"] += 1
            if 'test' in py_file:
                stats["Test files"] += 1
                stats["Test lines"] += lines

    # Count TypeScript files
    for root, dirs, files in os.walk("frontend/src"):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                file_path = os.path.join(root, file)
                with open(file_path, 'r') as f:
                    stats["TypeScript lines"] += len(f.readlines())
                    stats["TypeScript files"] += 1

    # Count documentation
    for doc_file in critical_files["Documentation"]:
        if check_file_exists(doc_file):
            with open(doc_file, 'r') as f:
                stats["Documentation lines"] += len(f.readlines())

    for key, value in stats.items():
        print(f"  {key}: {value}")

    # Final summary
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ All validation checks PASSED!")
    else:
        print("⚠️  Some validation checks FAILED!")
    print("=" * 60)

    return 0 if all_passed else 1

if __name__ == "__main__":
    exit(main())
