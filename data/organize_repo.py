import os
import re
import shutil
import sys
from pathlib import Path

# Configuration - MODIFY THESE SECTIONS TO MATCH YOUR REPOSITORY
REPO_ROOT = Path(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
DRY_RUN = True  # Set to False to actually move files

# Project folders
PROJECT_FOLDERS = {
    'splash': REPO_ROOT / 'splash',  # bikenode.com splash page
    'discord': REPO_ROOT / 'bikerole',  # discord bot
    'extension': REPO_ROOT / 'chrome-extension',  # chrome extension
    'shared_data': REPO_ROOT / 'data',  # shared datasets
}

# File patterns for each project (using regex patterns)
PROJECT_PATTERNS = {
    'splash': [
        r'index\.html$',
        r'splash.*\.js$',
        r'splash.*\.css$',
        r'home.*\.jsx?$',
        r'landing.*\.(js|jsx|ts|tsx)$'
    ],
    'discord': [
        r'bot\.js$',
        r'discord.*\.(js|ts)$',
        r'commands/.*\.js$',
        r'bikerole.*\.(js|ts)$'
    ],
    'extension': [
        r'manifest\.json$',
        r'content.*\.js$',
        r'background.*\.js$',
        r'popup\.(html|js|css)$',
        r'extension.*\.(js|ts|css)$'
    ],
    'shared_data': [
        r'motorcycles.*\.(json|csv|xlsx?)$',
        r'bicycles.*\.(json|csv|xlsx?)$',
        r'bikes.*\.(json|csv|xlsx?)$',
        r'components.*\.(json|csv|xlsx?)$',
        r'dataset.*\.(json|csv|xlsx?)$'
    ]
}

# Explicit file lists (for files that don't match patterns)
EXPLICIT_FILE_ASSIGNMENTS = {
    'splash': [
        # Add specific files for splash project
        # 'path/to/specific/file.js'
    ],
    'discord': [
        # Add specific files for discord bot
        # 'path/to/discord/specific/file.js'
    ],
    'extension': [
        # Add specific files for chrome extension
        # 'path/to/extension/specific/file.js'
    ],
    'shared_data': [
        # Add specific data files
        # 'path/to/specific/data_file.json'
    ]
}

# Files or directories to ignore completely
IGNORE_PATTERNS = [
    r'^\.git/',
    r'^node_modules/',
    r'^\.vscode/',
    r'^\.idea/',
    r'package-lock\.json$',
    r'yarn\.lock$',
    r'\.DS_Store$',
    r'.*\.pyc$',
    r'^__pycache__/',
]

def should_ignore(file_path):
    """Check if file should be ignored."""
    rel_path = str(file_path.relative_to(REPO_ROOT))
    return any(re.search(pattern, rel_path) for pattern in IGNORE_PATTERNS)

def determine_project(file_path):
    """Determine which project a file belongs to."""
    rel_path = str(file_path.relative_to(REPO_ROOT))
    
    # Check explicit assignments first
    for project, files in EXPLICIT_FILE_ASSIGNMENTS.items():
        if rel_path in files:
            return project
            
    # Then check patterns
    for project, patterns in PROJECT_PATTERNS.items():
        if any(re.search(pattern, rel_path) for pattern in patterns):
            return project
            
    return None  # Unknown project

def create_project_folders():
    """Create project folders if they don't exist."""
    for folder in PROJECT_FOLDERS.values():
        if not folder.exists():
            print(f"Creating directory: {folder}")
            if not DRY_RUN:
                folder.mkdir(parents=True, exist_ok=True)

def move_file(file_path, project):
    """Move a file to its project folder."""
    if project is None:
        print(f"UNKNOWN PROJECT: {file_path}")
        return

    # Determine the destination path
    rel_path = file_path.relative_to(REPO_ROOT)
    dest_folder = PROJECT_FOLDERS[project]
    
    # For shared data, we'll keep the file directly in the data folder
    if project == 'shared_data':
        dest_path = dest_folder / file_path.name
    else:
        # For project-specific files, we'll preserve any subfolder structure
        dest_path = dest_folder / rel_path
    
    # Create parent directories if they don't exist
    if not DRY_RUN:
        dest_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Move the file
    print(f"Moving: {file_path} -> {dest_path}")
    if not DRY_RUN:
        shutil.move(str(file_path), str(dest_path))

def organize_repo():
    """Main function to organize the repository."""
    create_project_folders()
    
    # Get all files in repo
    all_files = [p for p in REPO_ROOT.glob('**/*') if p.is_file()]
    
    # Track files by project for reporting
    files_by_project = {project: [] for project in PROJECT_FOLDERS.keys()}
    files_by_project['unknown'] = []
    
    for file_path in all_files:
        # Skip files that are already in project folders or should be ignored
        if should_ignore(file_path):
            continue
        
        # Skip files that are already in their correct project folder
        already_organized = False
        for project, folder in PROJECT_FOLDERS.items():
            if str(file_path).startswith(str(folder)):
                already_organized = True
                break
                
        if already_organized:
            continue
            
        project = determine_project(file_path)
        if project:
            files_by_project[project].append(file_path)
        else:
            files_by_project['unknown'].append(file_path)
    
    # Move files to their project folders
    for project, files in files_by_project.items():
        if project == 'unknown':
            continue
        for file_path in files:
            move_file(file_path, project)
    
    # Report files with unknown project
    print(f"\n{len(files_by_project['unknown'])} files with unknown project:")
    for file_path in files_by_project['unknown']:
        print(f"  {file_path}")

    # Summary
    print("\nSummary:")
    for project, files in files_by_project.items():
        print(f"  {project}: {len(files)} files")

if __name__ == "__main__":
    if DRY_RUN:
        print("DRY RUN MODE: No files will be moved.")
        print("Set DRY_RUN = False to actually move files.\n")
        
    organize_repo()
    
    if DRY_RUN:
        print("\nThis was a dry run. Set DRY_RUN = False to actually move files.")
