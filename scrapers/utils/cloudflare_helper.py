import os
import time
import sys
import tkinter as tk
from tkinter import messagebox
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
try:
    from webdriver_manager.chrome import ChromeDriverManager
except ImportError:
    print("Error: webdriver_manager package not installed.")
    print("Please install it using: pip install webdriver-manager")
    sys.exit(1)

def solve_cloudflare_challenge(url, timeout=300):
    """
    Open a browser window with clear instructions to solve a Cloudflare challenge
    
    Args:
        url: The URL to navigate to
        timeout: Maximum time to wait for the challenge to be solved (in seconds)
        
    Returns:
        Dict with keys: success (bool), cookies (dict), file (str)
    """
    print("\n" + "=" * 80)
    print("📢 CLOUDFLARE CHALLENGE HELPER")
    print("=" * 80)
    
    # Check if running in a graphical environment
    try:
        root = tk.Tk()
    except tk.TclError as e:
        print(f"Error: Cannot create GUI - {e}")
        print("Are you running in a non-graphical environment?")
        print("Try running this on a system with a graphical interface.")
        return {"success": False, "error": "No GUI available"}
    
    root.title("Cloudflare Challenge Solver")
    root.geometry("600x450")
    root.configure(bg="#f0f0f0")
    
    # Add window icon if available
    try:
        icon_path = os.path.join(os.path.dirname(__file__), "assets", "icon.png")
        if os.path.exists(icon_path):
            icon = tk.PhotoImage(file=icon_path)
            root.iconphoto(True, icon)
    except Exception:
        pass
    
    header = tk.Label(root, text="Cloudflare Challenge Solver", 
                     font=("Arial", 16, "bold"), bg="#f0f0f0")
    header.pack(pady=10)
    
    instructions = tk.Label(root, text="""
1. A Chrome browser window will open
2. Complete the CAPTCHA or challenge in that window
3. Wait until the actual website loads (with bike listings)
4. The tool will automatically detect when the challenge is solved
5. If automatic detection fails, click the "Challenge Completed" button
    """, justify=tk.LEFT, bg="#f0f0f0", font=("Arial", 12))
    instructions.pack(pady=10, padx=20)
    
    note = tk.Label(root, text="Note: Do NOT close the browser window manually!",
                   font=("Arial", 10, "italic"), fg="red", bg="#f0f0f0")
    note.pack(pady=5)
    
    status_var = tk.StringVar(value="Status: Waiting for browser to open...")
    status = tk.Label(root, textvariable=status_var, 
                     bg="#f0f0f0", font=("Arial", 10))
    status.pack(pady=10)
    
    # Setup browser options
    options = Options()
    options.add_argument("--start-maximized")  # Maximize the window for visibility
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    
    # Store result
    result = {"success": False, "cookies": {}}
    browser = None
    
    def start_browser():
        nonlocal result, browser
        try:
            try:
                browser = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
            except Exception as e:
                status_var.set(f"Error creating browser: {e}")
                messagebox.showerror("Browser Error", f"Failed to create browser: {e}\n\nMake sure Chrome is installed.")
                root.destroy()
                return
                
            # Use JavaScript to hide WebDriver from detection
            browser.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
                "source": """
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    
                    // Additional evasions
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' ?
                            Promise.resolve({ state: Notification.permission }) :
                            originalQuery(parameters)
                    );
                """
            })
            
            status_var.set("Status: Browser opened. Please solve the challenge...")
            
            # Open the target website
            try:
                browser.get(url)
            except Exception as e:
                status_var.set(f"Error loading page: {e}")
                messagebox.showerror("Navigation Error", f"Failed to load the page: {e}")
                browser.quit()
                root.destroy()
                return
            
            def on_completed():
                nonlocal result
                try:
                    if not browser:
                        status_var.set("Error: Browser is not running")
                        return
                        
                    # Get all cookies
                    all_cookies = browser.get_cookies()
                    cookies_dict = {cookie['name']: cookie['value'] for cookie in all_cookies}
                    
                    if not all_cookies:
                        status_var.set("Warning: No cookies found. Challenge may not be solved.")
                        messagebox.showwarning("No Cookies", "No cookies were found. The challenge may not be solved.")
                        return
                    
                    # Save cookies to a file
                    cookies_dir = "cookies"
                    os.makedirs(cookies_dir, exist_ok=True)
                    
                    # Format domain for filename
                    domain = url.split("//")[-1].split("/")[0]
                    cookies_file = os.path.join(cookies_dir, f"{domain}_cookies.txt")
                    
                    with open(cookies_file, 'w') as f:
                        for cookie in all_cookies:
                            f.write(f"{cookie['name']}={cookie['value']}; ")
                    
                    result = {"success": True, "cookies": cookies_dict, "file": cookies_file}
                    status_var.set(f"Success! Cookies saved to {cookies_file}")
                    
                    # Take a screenshot of the successful page
                    try:
                        screenshot_path = os.path.join(cookies_dir, f"{domain}_success.png")
                        browser.save_screenshot(screenshot_path)
                    except:
                        pass
                    
                    # Show success message
                    messagebox.showinfo("Success", f"Challenge solved successfully!\nCookies saved to {cookies_file}")
                    
                    # Close browser after a short delay
                    root.after(1000, lambda: browser.quit() if browser else None)
                    
                    # Close the GUI window after a short delay
                    root.after(2000, root.destroy)
                    
                except Exception as e:
                    status_var.set(f"Error: {e}")
                    messagebox.showerror("Error", f"An error occurred: {e}")
            
            def check_if_solved():
                # Check if Cloudflare challenge is gone and the real site is loaded
                if not browser:
                    return
                    
                try:
                    page_source = browser.page_source.lower()
                    page_title = browser.title.lower()
                    current_url = browser.current_url
                    
                    cloudflare_indicators = [
                        "just a moment",
                        "checking your browser",
                        "cloudflare",
                        "security check",
                        "captcha",
                        "please wait",
                        "challenge"
                    ]
                    
                    # More sophisticated detection:
                    # 1. Check if no more challenge indicators
                    no_challenge = not any(indicator in page_source for indicator in cloudflare_indicators) and \
                                  not any(indicator in page_title for indicator in cloudflare_indicators)
                                  
                    # 2. Check if URL changed (sometimes redirects after solving)
                    url_changed = url != current_url and "challenge" not in current_url
                    
                    # 3. Check for content that suggests the real page loaded
                    content_loaded = len(page_source) > 5000 and \
                                     ("bike" in page_source or "product" in page_source)
                    
                    if (no_challenge and content_loaded) or url_changed:
                        # The challenge appears to be solved
                        status_var.set("Challenge appears to be solved! Processing...")
                        on_completed()
                    else:
                        # Still on challenge page
                        status_var.set("Waiting for challenge to be solved... (Click the button when done)")
                        root.after(2000, check_if_solved)  # Check again in 2 seconds
                except Exception:
                    # If there's an error checking, just schedule another check
                    root.after(2000, check_if_solved)
            
            # Add a button to manually indicate completion
            button_frame = tk.Frame(root, bg="#f0f0f0")
            button_frame.pack(pady=20, fill="x")
            
            complete_btn = tk.Button(button_frame, text="Challenge Completed", 
                                    command=on_completed,
                                    font=("Arial", 12, "bold"),
                                    bg="#4CAF50", fg="white",
                                    padx=10, pady=5)
            complete_btn.pack(side="left", padx=10, expand=True)
            
            cancel_btn = tk.Button(button_frame, text="Cancel", 
                                  command=lambda: (browser.quit() if browser else None, root.destroy()),
                                  font=("Arial", 12),
                                  bg="#f44336", fg="white",
                                  padx=10, pady=5)
            cancel_btn.pack(side="right", padx=10, expand=True)
            
            # Start periodic check
            root.after(5000, check_if_solved)  # First check after 5 seconds
            
        except Exception as e:
            status_var.set(f"Error: {e}")
            messagebox.showerror("Error", f"An error occurred: {e}")
    
    # Start the browser after a short delay
    root.after(500, start_browser)
    
    # Clean up on window close
    def on_closing():
        if browser:
            try:
                browser.quit()
            except:
                pass
        root.destroy()
    
    root.protocol("WM_DELETE_WINDOW", on_closing)
    
    # Run the GUI
    root.mainloop()
    
    return result


def apply_cookies_to_session(session, cookies_file=None, cookies_dict=None):
    """Apply saved cookies to a requests session"""
    if cookies_file and os.path.exists(cookies_file):
        with open(cookies_file, 'r') as f:
            cookies_str = f.read().strip()
            for cookie_pair in cookies_str.split(';'):
                if cookie_pair.strip():
                    try:
                        name, value = cookie_pair.strip().split('=', 1)
                        session.cookies.set(name, value)
                    except ValueError:
                        continue
        return True
    elif cookies_dict:
        for name, value in cookies_dict.items():
            session.cookies.set(name, value)
        return True
    return False


def apply_cookies_to_webdriver(driver, cookies_dict=None, cookies_file=None):
    """
    Apply cookies to a webdriver instance
    
    Args:
        driver: WebDriver instance
        cookies_dict: Dictionary of cookies
        cookies_file: Path to file containing cookies
        
    Returns:
        bool: True if cookies were applied successfully
    """
    cookies = {}
    
    # Load cookies from file if provided
    if cookies_file and os.path.exists(cookies_file):
        with open(cookies_file, 'r') as f:
            cookies_str = f.read().strip()
            for cookie_pair in cookies_str.split(';'):
                if cookie_pair.strip():
                    try:
                        name, value = cookie_pair.strip().split('=', 1)
                        cookies[name] = value
                    except ValueError:
                        continue
    
    # Use provided cookie dict if available
    if cookies_dict:
        cookies.update(cookies_dict)
    
    if not cookies:
        return False
    
    # Get current domain
    current_domain = driver.current_url.split("//")[-1].split("/")[0]
    
    # Apply cookies
    for name, value in cookies.items():
        try:
            driver.add_cookie({
                "name": name,
                "value": value,
                "domain": current_domain
            })
        except Exception as e:
            print(f"Error adding cookie {name}: {e}")
    
    return True


if __name__ == "__main__":
    # Test the helper by solving a challenge
    print("Testing Cloudflare challenge solver...")
    result = solve_cloudflare_challenge("https://99spokes.com/bikes")
    
    if result.get("success"):
        print(f"Successfully solved challenge! Cookies saved to: {result.get('file')}")
        print(f"Found {len(result['cookies'])} cookies")
    else:
        print("Failed to solve the challenge.")
        if 'error' in result:
            print(f"Error: {result['error']}")
