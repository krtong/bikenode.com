import os
from pathlib import Path

def validate_workspace():
    """
    Check the current state of the workspace to confirm cleanup was successful.
    """
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    
    print("\n=== BIKENODE.COM WORKSPACE STATUS ===\n")
    
    # Check which files currently exist
    python_files = list(base_dir.glob("*.py"))
    print(f"Python files found: {len(python_files)}")
    for file in sorted(python_files):
        print(f"  - {file.name}")
    
    # Check if duplicate bot files were removed
    duplicate_bots = ["discord_bot_example.py", "enhanced_discord_bot.py", 
                      "enhanced_discord_bot_with_bicycles.py", "discord_bot_setup_test.py"]
    remaining_dupes = [f for f in duplicate_bots if (base_dir / f).exists()]
    
    if remaining_dupes:
        print("\n❌ The following duplicate bot files still exist:")
        for file in remaining_dupes:
            print(f"  - {file}")
    else:
        print("\n✅ No duplicate bot files found - cleanup was successful!")
    
    # Check if necessary directories exist
    dirs = ["motorcycles", "bicycles", "processed"]
    missing_dirs = [d for d in dirs if not (base_dir / d).is_dir()]
    
    if missing_dirs:
        print("\n❌ Missing required directories:")
        for dir_name in missing_dirs:
            print(f"  - {dir_name}")
    else:
        print("\n✅ All required directories exist.")

    # Final status
    if not remaining_dupes and not missing_dirs:
        print("\n🎉 WORKSPACE IS CLEAN AND READY! 🎉")
        print("You can now use 'bikerole_bot.py' as your single Discord bot implementation.")
    else:
        print("\n⚠️ Some cleanup issues remain. Please address them for a clean workspace.")

if __name__ == "__main__":
    validate_workspace()
