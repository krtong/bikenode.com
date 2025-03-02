#!/usr/bin/env python3
"""
BikeNode.com Repository Cleanup Script

This script helps organize the BikeNode.com repository by:
1. Fixing syntax errors in test files
2. Removing backup and redundant files
3. Organizing the repository into a cleaner structure
4. Creating appropriate directories for web extension and scraper code
"""

import os
import shutil
import re
from datetime import datetime
import argparse
import json

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

# Web extension files organization
WEB_EXTENSION_FILES = {
    'chrome': [
        'web_extension/chrome/content.js',
        'web_extension/chrome/background.js',
        'web_extension/chrome/popup.js',
        'web_extension/chrome/popup.html',
        'web_extension/chrome/manifest.json',
    ],
    'common': [
        'web_extension/common/utils.js',
        'web_extension/common/styles.css',
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

def fix_test_files(repo_dir):
    """Fix syntax errors in test files"""
    fixed_files = []
    
    # Fix the "rem" syntax error in messaging.unit.test.js
    test_file_path = os.path.join(repo_dir, '__tests__/messaging.unit.test.js')
    if os.path.exists(test_file_path):
        with open(test_file_path, 'r') as file:
            content = file.read()
        
        # Replace the standalone "rem" line
        fixed_content = re.sub(r'\n\s*rem\s*\n', '\n', content)
        
        if content != fixed_content:
            with open(test_file_path, 'w') as file:
                file.write(fixed_content)
            fixed_files.append('__tests__/messaging.unit.test.js')
    
    return fixed_files

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
        'redundant': [],
        'redundant_tests': []
    }
    
    # Special case: check if messaging.test.js exists alongside the newer unit test version
    if (os.path.exists(os.path.join(repo_dir, '__tests__/messaging.test.js')) and
        os.path.exists(os.path.join(repo_dir, '__tests__/messaging.unit.test.js'))):
        files_to_delete['redundant_tests'].append('__tests__/messaging.test.js')
    
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
        'web_extension/organized': os.path.join(repo_dir, 'web_extension/organized'),
        'web_extension/organized/chrome': os.path.join(repo_dir, 'web_extension/organized/chrome'),
        'web_extension/organized/common': os.path.join(repo_dir, 'web_extension/organized/common'),
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
            
    # Organize web extension files
    for category, files in WEB_EXTENSION_FILES.items():
        for file_path in files:
            src_path = os.path.join(repo_dir, file_path)
            if os.path.exists(src_path):
                # Extract the filename from the path
                filename = os.path.basename(file_path)
                # Create the destination path in the organized directory
                dst_path = os.path.join(
                    directories[f'web_extension/organized/{category}'], 
                    filename
                )
                # Use copy instead of move to preserve original structure
                shutil.copy(src_path, dst_path)
                moved_files[f'web_extension/organized/{category}'].append(filename)
    
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
                    try:
                        os.remove(filepath)
                        deleted_files[category].append(file)
                    except Exception as e:
                        print(f"Error deleting {file}: {e}")
    
    return deleted_files

def create_action_report(backup_dir, fixed_files, deleted_files, moved_files):
    """Create a report of all actions taken"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = f"cleanup_report_{timestamp}.txt"
    
    with open(report_path, 'w') as f:
        f.write("BikeNode.com Repository Cleanup Report\n")
        f.write("=====================================\n\n")
        
        if backup_dir:
            f.write(f"Backup created: {backup_dir}\n\n")
        
        if fixed_files:
            f.write("Files Fixed:\n")
            f.write("-----------\n")
            for file in sorted(fixed_files):
                f.write(f"  - {file}\n")
            f.write("\n")
        
        f.write("Files Deleted:\n")
        f.write("-------------\n")
        for category, files in deleted_files.items():
            if files:
                f.write(f"\n{category.upper()}:\n")
                for file in sorted(files):
                    f.write(f"  - {file}\n")
        
        f.write("\n\nFiles Organized:\n")
        f.write("---------------\n")
        for category, files in moved_files.items():
            if files:
                f.write(f"\n{category.upper()}:\n")
                for file in sorted(files):
                    f.write(f"  - {file}\n")
    
    return report_path

def main():
    parser = argparse.ArgumentParser(description='Clean up and organize BikeNode.com repository')
    parser.add_argument('--repo-dir', default='.', help='Repository directory path')
    parser.add_argument('--dry-run', action='store_true', help='Only show what would be done, without making changes')
    parser.add_argument('--no-backup', action='store_true', help='Skip creating a backup')
    parser.add_argument('--no-fix', action='store_true', help='Skip fixing syntax errors in files')
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
    
    # Fix syntax errors in test files
    fixed_files = []
    if not args.no_fix and not args.dry_run:
        fixed_files = fix_test_files(repo_dir)
        if fixed_files:
            print("\nFixed syntax errors in these files:")
            for file in fixed_files:
                print(f"  - {file}")
    
    # Identify files to delete
    files_to_delete = identify_files_to_delete(repo_dir)
    
    print("\nIdentified files to delete:")
    for category, files in files_to_delete.items():
        if files:
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
    moved_files = {}
    if not args.dry_run:
        directories = create_directory_structure(repo_dir)
        moved_files = organize_files(repo_dir, directories)
        
        # Create report
        report_path = create_action_report(backup_dir, fixed_files, deleted_files, moved_files)
        print(f"\nCleanup complete! Report saved to: {report_path}")
    else:
        print("\nDry run complete. No changes were made.")
        print("Run without --dry-run to perform actual cleanup.")

    # Create README.md with repository structure documentation
    if not args.dry_run:
        create_repository_documentation(repo_dir)

def create_repository_documentation(repo_dir):
    """Create a README.md file documenting the repository structure"""
    readme_path = os.path.join(repo_dir, "README.md")
    
    with open(readme_path, 'w') as f:
        f.write("# BikeNode.com\n\n")
        f.write("## Repository Structure\n\n")
        
        f.write("### Core Components\n")
        f.write("- `core/` - Essential components and main execution scripts\n")
        f.write("- `scrapers/` - Main scraper implementations\n")
        f.write("  - `specialized/` - Specialized scrapers for specific use cases\n")
        f.write("- `analysis/` - Data analysis and visualization tools\n")
        f.write("- `utils/` - Utility functions and helper scripts\n\n")
        
        f.write("### Web Extension\n")
        f.write("- `web_extension/` - Chrome extension code\n")
        f.write("  - `chrome/` - Chrome-specific implementation\n")
        f.write("  - `common/` - Shared utilities and styles\n\n")
        
        f.write("### Tests\n")
        f.write("- `__tests__/` - Jest test files for the web extension\n\n")
        
        f.write("### Data\n")
        f.write("- `data/` - Data files and processing scripts\n")
        
        f.write("\n\n*This README was automatically generated during repository cleanup.*\n")
    
    print(f"Created README.md with repository structure documentation")

if __name__ == "__main__":
    main()