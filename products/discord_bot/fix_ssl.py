#!/usr/bin/env python3
"""
Script to fix SSL certificate issues on macOS.
Run this if you're experiencing SSL certificate verification problems.
"""
import os
import sys
import subprocess
import certifi
import ssl
import urllib.request

def fix_mac_ssl():
    """Fix SSL certificate verification issues on macOS"""
    print("Attempting to fix SSL certificate issues...")
    
    # Get the certifi certificate path
    ssl_cert_file = certifi.where()
    print(f"Certificate path: {ssl_cert_file}")
    
    # Method 1: Using the Install Certificates command
    cert_paths = [
        "/Applications/Python 3.13/Install Certificates.command",
        "/Applications/Python 3.12/Install Certificates.command",
        "/Applications/Python 3.11/Install Certificates.command",
        "/Applications/Python 3.10/Install Certificates.command",
        "/Applications/Python 3.9/Install Certificates.command"
    ]
    
    cert_installed = False
    for cert_command in cert_paths:
        if os.path.exists(cert_command):
            print(f"Running: {cert_command}")
            result = subprocess.run([cert_command], shell=True)
            if result.returncode == 0:
                print("Certificate installation successful!")
                cert_installed = True
                break
    
    if not cert_installed:
        print("Could not find certificate installer. Trying manual approach.")
    
    # Method 2: Set environment variables
    print("\nSetting SSL environment variables:")
    os.environ["SSL_CERT_FILE"] = ssl_cert_file
    os.environ["REQUESTS_CA_BUNDLE"] = ssl_cert_file
    os.environ["NODE_EXTRA_CA_CERTS"] = ssl_cert_file
    print(f"SSL_CERT_FILE={ssl_cert_file}")
    
    # Create a shell script to export these variables for future terminal sessions
    with open("set_ssl_env.sh", "w") as f:
        f.write('#!/bin/bash\n')
        f.write(f'export SSL_CERT_FILE="{ssl_cert_file}"\n')
        f.write(f'export REQUESTS_CA_BUNDLE="{ssl_cert_file}"\n')
        f.write(f'export NODE_EXTRA_CA_CERTS="{ssl_cert_file}"\n')
        f.write('\necho "SSL certificate environment variables set!"\n')
    
    os.chmod("set_ssl_env.sh", 0o755)
    print("\nCreated set_ssl_env.sh script. Run it with:")
    print("  source ./set_ssl_env.sh")
    
    # Method 3: Configure global SSL context
    print("\nConfiguring global SSL context...")
    try:
        # Create default SSL context using certifi
        default_context = ssl.create_default_context(cafile=certifi.where())
        # Apply it to urllib which is used by many libraries
        urllib.request.opener = urllib.request.build_opener(
            urllib.request.HTTPSHandler(context=default_context)
        )
        print("Global SSL context configured.")
        
        # Test the connection with user agent header
        print("\nTesting connection to Google...")
        req = urllib.request.Request(
            "https://www.google.com",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        test_response = urllib.request.urlopen(req)
        print(f"Connection successful! Status code: {test_response.status}")
    except Exception as e:
        print(f"Error configuring SSL or testing connection: {e}")
        print("\nAdditional options to try:")
        print("1. Install certifi with pip: pip install --upgrade certifi")
        print("2. Install Python from python.org instead of Homebrew")
        print("3. Add SSL_CERT_DIR environment variable to your shell profile")
    
    return True
    
if __name__ == "__main__":
    if sys.platform == "darwin":
        success = fix_mac_ssl()
        if success:
            print("\nSSL certificate configuration complete. Try running your bot again.")
        else:
            print("\nSSL certificate configuration failed.")
    else:
        print("This script is intended for macOS. No action needed on your platform.")
