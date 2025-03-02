import os
from pathlib import Path

def verify_workspace_cleanup():
    """
    Verify that the workspace is clean after running cleanup.py.
    This checks that duplicate bot files were removed and only essential files remain.
    """
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    
    # Files that should be deleted
    files_should_be_deleted = [
        "discord_bot_example.py",
        "enhanced_discord_bot.py",
        "enhanced_discord_bot_with_bicycles.py",
        "discord_bot_setup_test.py",
    ]
    
    # Essential files that should remain
    essential_files = [
        "bikerole_bot.py",              # Main bot implementation
        "bike_lookup.py",               # Original lookup system
        "bike_lookup_extended.py",      # Extended lookup system with bicycle support
        "README.md",                    # Documentation
        "discord_bot_commands.md",      # Command reference
        "setup_database.py",            # Database setup script
        "generate_bicycle_data.py",     # Bicycle data generator
        "cleanup.py",                   # Cleanup script
        "verify_cleanup.py"             # This verification script
    ]
    
    # Check for deleted files
    deleted_files_found = []
    for filename in files_should_be_deleted:
        file_path = base_dir / filename
        if file_path.exists():
            deleted_files_found.append(filename)
    
    # Check for essential files
    missing_essentials = []
    for filename in essential_files:
        file_path = base_dir / filename
        # Skip this verification script itself if we're running it for the first time
        if filename == "verify_cleanup.py" and not file_path.exists():
            continue
        if not file_path.exists() and not filename == "verify_cleanup.py":
            missing_essentials.append(filename)
    
    # Check for necessary directories
    directories = ["motorcycles", "bicycles", "processed"]
    missing_dirs = []
    for dirname in directories:
        dir_path = base_dir / dirname
        if not dir_path.exists() or not dir_path.is_dir():
            missing_dirs.append(dirname)
    
    # Print results
    print("===== WORKSPACE VERIFICATION REPORT =====\n")
    
    if deleted_files_found:
        print("❌ The following files should have been deleted but still exist:")
        for file in deleted_files_found:
            print(f"   - {file}")
        print("\nCleanup may not have completed successfully. Try running 'python cleanup.py' again.\n")
    else:
        print("✅ All duplicate bot files have been successfully removed.\n")
    
    if missing_essentials:
        print("❌ The following essential files are missing:")
        for file in missing_essentials:
            print(f"   - {file}")
        print("\nSome essential files were lost during cleanup.\n")
    else:
        print("✅ All essential files are present in the workspace.\n")
    
    if missing_dirs:
        print("❌ The following directories are missing:")
        for directory in missing_dirs:
            print(f"   - {directory}")
        print("\nSome required directories are missing.\n")
    else:
        print("✅ All necessary directories exist.\n")
    
    # Overall summary
    if not deleted_files_found and not missing_essentials and not missing_dirs:
        print("🎉 WORKSPACE IS CLEAN! 🎉")
        print("The project structure is optimal with only the necessary files.")
        print("\nYou can now run the bot with a single command:")
        print("python bikerole_bot.py")
    else:
        print("⚠️ WORKSPACE NEEDS ATTENTION ⚠️")
        print("Please address the issues above to ensure a clean project structure.")

if __name__ == "__main__":
    verify_workspace_cleanup()
