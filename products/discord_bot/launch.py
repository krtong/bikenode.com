#!/usr/bin/env python3
"""
BikeNode Discord Bot Launcher

This script handles SSL certificate issues automatically and runs the bot.
This is the recommended way to start the bot, especially on macOS.
"""
import os
import sys
import platform
import subprocess
import traceback
import certifi

def main():
    print("=== BikeNode Discord Bot Launcher ===")
    
    # Set SSL environment variables if on macOS
    if platform.system() == "Darwin":
        print("Setting up SSL for macOS...")
        try:
            # Use certifi's certificate path
            cert_path = certifi.where()
            os.environ["SSL_CERT_FILE"] = cert_path
            os.environ["REQUESTS_CA_BUNDLE"] = cert_path
            os.environ["NODE_EXTRA_CA_CERTS"] = cert_path
            
            print(f"SSL certificate path: {cert_path}")
            
            # Make sure ssl is properly working
            import ssl
            ssl._create_default_https_context = ssl.create_default_context
        except Exception as e:
            print(f"WARNING: SSL setup encountered an issue: {e}")
            print("The bot may still work. If you encounter SSL errors, run fix_ssl.py first.")
    
    print("Starting the bot...")
    try:
        import bot
        import asyncio
        asyncio.run(bot.run_bot())
    except ImportError as e:
        print(f"Error importing bot module: {e}")
        print("Make sure you're running this from the correct directory.")
        sys.exit(1)
    except Exception as e:
        print(f"Error running bot: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    # Make script executable from anywhere
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Run main function
    main()
