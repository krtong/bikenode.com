#!/usr/bin/env python3
"""
Utility script to find and delete empty directories in the codebase.
"""

import os
import argparse
import sys
from datetime import datetime

def is_dir_empty(dir_path):
    """Check if directory is empty (contains no files or subdirectories)."""
    with os.scandir(dir_path) as it:
        # Convert iterator to list because we need to check its length
        contents = list(it)
        return len(contents) == 0

def find_empty_dirs(base_path, ignore_patterns=None):
    """
    Find all empty directories under the base path.
    
    Args:
        base_path: Base directory to start search from
        ignore_patterns: List of directory name patterns to ignore
    
    Returns:
        List of empty directory paths
    """
    if ignore_patterns is None:
        ignore_patterns = ['.git', 'node_modules', '.venv', 'venv']
    
    empty_dirs = []
    
    for root, dirs, files in os.walk(base_path, topdown=False):
        # Skip directories matching ignore patterns
        dirs_to_remove = []
        for i, dir_name in enumerate(dirs):
            if any(pattern in dir_name for pattern in ignore_patterns):
                dirs_to_remove.append(i)
        
        for i in reversed(dirs_to_remove):
            del dirs[i]
        
        # Check if directory is empty
        if is_dir_empty(root):
            # Don't include the base directory itself
            if root != base_path:
                empty_dirs.append(root)
    
    return empty_dirs

def remove_empty_dirs(empty_dirs, dry_run=True):
    """
    Remove the empty directories.
    
    Args:
        empty_dirs: List of directory paths to remove
        dry_run: If True, only print what would be deleted without actually removing
    
    Returns:
        Number of directories removed
    """
    removed_count = 0
    
    for dir_path in empty_dirs:
        try:
            if dry_run:
                print(f"Would remove empty directory: {dir_path}")
            else:
                os.rmdir(dir_path)
                print(f"Removed empty directory: {dir_path}")
            removed_count += 1
        except OSError as e:
            print(f"Error removing directory {dir_path}: {e}", file=sys.stderr)
    
    return removed_count

def main():
    parser = argparse.ArgumentParser(description="Find and delete empty directories in the codebase.")
    parser.add_argument("--path", default=".", help="Base path to start search from (default: current directory)")
    parser.add_argument("--dry-run", action="store_true", help="Only print directories that would be deleted")
    parser.add_argument("--ignore", nargs="+", default=['.git', 'node_modules', '.venv', 'venv'], 
                        help="Directory patterns to ignore (default: .git node_modules .venv venv)")
    parser.add_argument("--log-file", help="Write output to log file in addition to stdout")
    args = parser.parse_args()
    
    base_path = os.path.abspath(args.path)
    
    print(f"Searching for empty directories in: {base_path}")
    if args.dry_run:
        print("DRY RUN - No directories will be deleted")
    
    start_time = datetime.now()
    empty_dirs = find_empty_dirs(base_path, args.ignore)
    
    # Sort directories by depth (deepest first) to handle nested empty directories
    empty_dirs.sort(key=lambda x: x.count(os.sep), reverse=True)
    
    removed_count = remove_empty_dirs(empty_dirs, args.dry_run)
    end_time = datetime.now()
    
    summary = f"\nFound {len(empty_dirs)} empty directories"
    if args.dry_run:
        summary += f"\nWould remove {removed_count} directories"
    else:
        summary += f"\nRemoved {removed_count} directories"
    summary += f"\nTime taken: {end_time - start_time}"
    
    print(summary)
    
    if args.log_file:
        try:
            with open(args.log_file, 'w') as f:
                f.write(f"Empty directory cleanup - {start_time}\n")
                f.write(f"Base path: {base_path}\n\n")
                for dir_path in empty_dirs:
                    f.write(f"{dir_path}\n")
                f.write(summary)
            print(f"Log written to: {args.log_file}")
        except Exception as e:
            print(f"Error writing log file: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
