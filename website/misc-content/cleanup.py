#!/usr/bin/env python3
"""
BikeNode.com Repository Cleanup Script

This script helps clean up and organize the repository by:
1. Removing backup files
2. Deleting one-time fix scripts
3. Consolidating redundant functionality
4. Organizing remaining files into appropriate folders
"""

import os
import shutil
import re
from datetime import datetime
import argparse

# Define file categories
BACKUP_FILES = [
    r'.*\.bak.*',
    r'.*\.bak$',
    r'data/bicycles/scrape\.py\.bak.*',
]

FIX_SCRIPTS = [
    'fix_bot_detection.py',
    'fix_challenge_detection.py',
    'fix_constructor.py',
    'fix_indentation.py',
    'fix_missing_images.py',
    'fix_scraper.py',
    'quick_fix.py',
    'scrape_fix.py',
    'scrape_rewrite.py',
    'update_scraper.py',
    'update_scraper_for_makerids.py',
]

REDUNDANT_MERGERS = [
    # Keep merge_data.py, remove others
    'merge_bike_data.py',
    'combine_data.py',
]

SCRAPERS_TO_ORGANIZE = {
    'main_scrapers': [
        'comprehensive_scraper.py',
        'hierarchical_bike_scraper.py',
        'batch_scraper.py',
    ],
    'specialized_scrapers': [
        'brand_by_brand_scraper.py',
        'pattern_bike_scraper.py',
        'direct_bike_extractor.py',
        'extract_all_bikes.py',
    ]
}

# Core files to keep (and organize)
CORE_FILES = {
    'core': [
        'bike_catalog_extractor.py',
        'cloudflare_helper.py',
        'merge_data.py',
        'start.sh',
        'setup.sh',
        'conda_setup.sh',
        'run_scraper.py',
        'resume_scraper.py',
    ],
    'analysis': [
        'analyze_bike_listings.py',
        'analyze_bikes.py',
        'analyze_results.py',
        'visualize_data.py',
    ]
}

def backup_repository(repo_dir):
    """Create a backup of the repository before making changes"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(repo_dir, f"backup_{timestamp}")
    
    print(f"Creating backup in: {backup_dir}")
    
    # Copy all files except large data files and hidden directories
    shutil.copytree(
        repo_dir, 
        backup_dir,
        ignore=shutil.ignore_patterns(
            '*.csv', '*.json', 'debug_output/*', 
            'batched_output/*', 'backup_*', 
            '__pycache__', 'node_modules', '.git'
        )
    )
    
    return backup_dir

def identify_files_to_delete(repo_dir):
    """Identify files that should be deleted"""
    files_to_delete = {
        'backups': [],
        'fix_scripts': [],
        'redundant': []
    }
    
    # Walk through all files in the repository
    for root, _, files in os.walk(repo_dir):
        for file in files:
            filepath = os.path.join(root, file)
            rel_path = os.path.relpath(filepath, repo_dir)
            
            # Skip the script itself and backup directory
            if 'backup_' in filepath or os.path.basename(filepath) == os.path.basename(__file__):
                continue
                
            # Check backup files
            if any(re.match(pattern, rel_path) for pattern in BACKUP_FILES):
                files_to_delete['backups'].append(rel_path)
                continue
                
            # Check fix scripts
            if file in FIX_SCRIPTS:
                files_to_delete['fix_scripts'].append(rel_path)
                continue
                
            # Check redundant merger scripts
            if file in REDUNDANT_MERGERS:
                files_to_delete['redundant'].append(rel_path)
    
    return files_to_delete

def create_directory_structure(repo_dir):
    """Create organized directory structure"""
    directories = {
        'scrapers': os.path.join(repo_dir, 'scrapers'),
        'scrapers/specialized': os.path.join(repo_dir, 'scrapers/specialized'),
        'core': os.path.join(repo_dir, 'core'),
        'analysis': os.path.join(repo_dir, 'analysis'),
        'utils': os.path.join(repo_dir, 'utils'),
        'deprecated': os.path.join(repo_dir, 'deprecated'),
    }
    
    for dir_path in directories.values():
        os.makedirs(dir_path, exist_ok=True)
        
    return directories

def organize_files(repo_dir, directories):
    """Move files to their appropriate directories"""
    moved_files = {category: [] for category in directories.keys()}
    
    # Organize main scrapers
    for file in SCRAPERS_TO_ORGANIZE['main_scrapers']:
        src_path = os.path.join(repo_dir, file)
        if os.path.exists(src_path):
            dst_path = os.path.join(directories['scrapers'], file)
            shutil.move(src_path, dst_path)
            moved_files['scrapers'].append(file)
    
    # Organize specialized scrapers
    for file in SCRAPERS_TO_ORGANIZE['specialized_scrapers']:
        src_path = os.path.join(repo_dir, file)
        if os.path.exists(src_path):
            dst_path = os.path.join(directories['scrapers/specialized'], file)
            shutil.move(src_path, dst_path)
            moved_files['scrapers/specialized'].append(file)
    
    # Organize core files
    for file in CORE_FILES['core']:
        src_path = os.path.join(repo_dir, file)
        if os.path.exists(src_path):
            dst_path = os.path.join(directories['core'], file)
            shutil.move(src_path, dst_path)
            moved_files['core'].append(file)
            
    # Organize analysis files
    for file in CORE_FILES['analysis']:
        src_path = os.path.join(repo_dir, file)
        if os.path.exists(src_path):
            dst_path = os.path.join(directories['analysis'], file)
            shutil.move(src_path, dst_path)
            moved_files['analysis'].append(file)
            
    return moved_files

def delete_files(repo_dir, files_to_delete, dry_run=True):
    """Delete files based on categories"""
    deleted_files = {category: [] for category in files_to_delete.keys()}
    
    for category, files in files_to_delete.items():
        for file in files:
            filepath = os.path.join(repo_dir, file)
            if os.path.exists(filepath):
                if dry_run:
                    print(f"Would delete: {file}")
                else:
                    os.remove(filepath)
                    deleted_files[category].append(file)
    
    return deleted_files

def create_action_report(backup_dir, deleted_files, moved_files):
    """Create a report of all actions taken"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = f"cleanup_report_{timestamp}.txt"
    
    with open(report_path, 'w') as f:
        f.write("BikeNode.com Repository Cleanup Report\n")
        f.write("=====================================\n\n")
        
        f.write(f"Backup created: {backup_dir}\n\n")
        
        f.write("Files Deleted:\n")
        f.write("-------------\n")
        for category, files in deleted_files.items():
            f.write(f"\n{category.upper()}:\n")
            for file in sorted(files):
                f.write(f"  - {file}\n")
        
        f.write("\n\nFiles Organized:\n")
        f.write("---------------\n")
        for category, files in moved_files.items():
            f.write(f"\n{category.upper()}:\n")
            for file in sorted(files):
                f.write(f"  - {file}\n")
    
    return report_path

def main():
    parser = argparse.ArgumentParser(description='Clean up and organize BikeNode.com repository')
    parser.add_argument('--repo-dir', default='.', help='Repository directory path')
    parser.add_argument('--dry-run', action='store_true', help='Only show what would be done, without making changes')
    parser.add_argument('--no-backup', action='store_true', help='Skip creating a backup')
    args = parser.parse_args()
    
    repo_dir = os.path.abspath(args.repo_dir)
    
    print(f"BikeNode.com Repository Cleanup")
    print(f"============================")
    print(f"Repository: {repo_dir}")
    print(f"Dry run: {'Yes' if args.dry_run else 'No'}")
    
    # Create backup unless skipped
    backup_dir = None
    if not args.no_backup and not args.dry_run:
        backup_dir = backup_repository(repo_dir)
        print(f"Backup created at: {backup_dir}")
    
    # Identify files to delete
    files_to_delete = identify_files_to_delete(repo_dir)
    
    print("\nIdentified files to delete:")
    for category, files in files_to_delete.items():
        print(f"\n{category.upper()} ({len(files)}):")
        for file in sorted(files)[:10]:  # Show first 10 files only
            print(f"  - {file}")
        if len(files) > 10:
            print(f"  ... and {len(files) - 10} more")
    
    # Confirm before proceeding
    if not args.dry_run:
        proceed = input("\nProceed with cleanup? (y/n): ").strip().lower()
        if proceed != 'y':
            print("Cleanup aborted.")
            return
    
    # Delete identified files
    deleted_files = delete_files(repo_dir, files_to_delete, args.dry_run)
    
    # Create directory structure and organize files
    if not args.dry_run:
        directories = create_directory_structure(repo_dir)
        moved_files = organize_files(repo_dir, directories)
        
        # Create report
        report_path = create_action_report(backup_dir, deleted_files, moved_files)
        print(f"\nCleanup complete! Report saved to: {report_path}")
    else:
        print("\nDry run complete. No changes were made.")
        print("Run without --dry-run to perform actual cleanup.")

if __name__ == "__main__":
    main()