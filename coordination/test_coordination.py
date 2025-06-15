#!/usr/bin/env python3
"""
Testing Framework for Python Coordination System
Instance-2's validation and edge case testing suite
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path
import subprocess
import time

# Add coordination directory to path
coord_dir = Path(__file__).parent
sys.path.insert(0, str(coord_dir))

from coordination import CoordinationSystem

class CoordinationTester:
    def __init__(self):
        self.test_dir = None
        self.coord = None
        self.results = []
        
    def setup_test_env(self):
        """Create isolated test environment"""
        self.test_dir = Path(tempfile.mkdtemp())
        # Copy coordination.py to test dir
        shutil.copy(coord_dir / "coordination.py", self.test_dir)
        os.chdir(self.test_dir)
        self.coord = CoordinationSystem("test-instance")
        
    def cleanup_test_env(self):
        """Clean up test environment"""
        if self.test_dir and self.test_dir.exists():
            shutil.rmtree(self.test_dir)
            
    def test_empty_message_validation(self):
        """Test empty message handling"""
        try:
            self.coord.send_message("#test", "")
            return {"test": "empty_message", "status": "FAIL", "error": "Empty message accepted"}
        except ValueError as e:
            if "empty" in str(e).lower():
                return {"test": "empty_message", "status": "PASS", "message": "Empty message rejected"}
            return {"test": "empty_message", "status": "FAIL", "error": str(e)}
        except Exception as e:
            return {"test": "empty_message", "status": "ERROR", "error": str(e)}
            
    def test_empty_target_validation(self):
        """Test empty target handling"""
        try:
            self.coord.send_message("", "test message")
            return {"test": "empty_target", "status": "FAIL", "error": "Empty target accepted"}
        except ValueError as e:
            if "empty" in str(e).lower():
                return {"test": "empty_target", "status": "PASS", "message": "Empty target rejected"}
            return {"test": "empty_target", "status": "FAIL", "error": str(e)}
        except Exception as e:
            return {"test": "empty_target", "status": "ERROR", "error": str(e)}
            
    def test_whitespace_validation(self):
        """Test whitespace-only messages"""
        try:
            self.coord.send_message("#test", "   \n\t  ")
            return {"test": "whitespace_message", "status": "FAIL", "error": "Whitespace-only message accepted"}
        except ValueError as e:
            return {"test": "whitespace_message", "status": "PASS", "message": "Whitespace-only message rejected"}
        except Exception as e:
            return {"test": "whitespace_message", "status": "ERROR", "error": str(e)}
            
    def test_valid_message_flow(self):
        """Test normal message flow"""
        try:
            msg_id = self.coord.send_message("#test", "Valid test message")
            if msg_id and len(msg_id) == 8:
                return {"test": "valid_message", "status": "PASS", "message": f"Valid message sent with ID {msg_id}"}
            return {"test": "valid_message", "status": "FAIL", "error": "Invalid message ID format"}
        except Exception as e:
            return {"test": "valid_message", "status": "ERROR", "error": str(e)}
            
    def test_notification_system(self):
        """Test notification detection"""
        try:
            # Send message with mention
            self.coord.send_message("#test", "@test-instance this is a mention")
            result = self.coord.check_notifications()
            
            if result["mentions"] >= 1:
                return {"test": "notifications", "status": "PASS", "message": f"Mention detected: {result}"}
            return {"test": "notifications", "status": "FAIL", "error": f"Mention not detected: {result}"}
        except Exception as e:
            return {"test": "notifications", "status": "ERROR", "error": str(e)}
            
    def test_cli_interface(self):
        """Test CLI interface"""
        try:
            result = subprocess.run([
                sys.executable, "coordination.py", "send", "#test", "CLI test message"
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and "Message sent" in result.stdout:
                return {"test": "cli_interface", "status": "PASS", "message": "CLI working correctly"}
            return {"test": "cli_interface", "status": "FAIL", "error": f"CLI failed: {result.stderr}"}
        except Exception as e:
            return {"test": "cli_interface", "status": "ERROR", "error": str(e)}
            
    def test_performance_bulk_operations(self):
        """Test performance with bulk operations"""
        try:
            start_time = time.time()
            
            # Send 100 messages
            for i in range(100):
                self.coord.send_message("#perf-test", f"Bulk message {i}")
                
            send_time = time.time() - start_time
            
            # Check notifications
            start_time = time.time()
            result = self.coord.check_notifications()
            check_time = time.time() - start_time
            
            return {
                "test": "bulk_performance", 
                "status": "PASS", 
                "message": f"100 messages sent in {send_time:.2f}s, notifications checked in {check_time:.2f}s"
            }
        except Exception as e:
            return {"test": "bulk_performance", "status": "ERROR", "error": str(e)}
            
    def run_all_tests(self):
        """Run complete test suite"""
        print("🧪 COORDINATION SYSTEM TEST SUITE")
        print("=" * 50)
        
        try:
            self.setup_test_env()
            
            # Run all tests
            tests = [
                self.test_empty_message_validation,
                self.test_empty_target_validation,
                self.test_whitespace_validation,
                self.test_valid_message_flow,
                self.test_notification_system,
                self.test_cli_interface,
                self.test_performance_bulk_operations
            ]
            
            for test_func in tests:
                result = test_func()
                self.results.append(result)
                
                status_icon = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️"
                print(f"{status_icon} {result['test']}: {result['status']}")
                
                if result["status"] == "PASS" and "message" in result:
                    print(f"   {result['message']}")
                elif result["status"] in ["FAIL", "ERROR"]:
                    print(f"   {result['error']}")
                    
        finally:
            self.cleanup_test_env()
            
        # Summary
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")
        errors = sum(1 for r in self.results if r["status"] == "ERROR")
        
        print("\n📊 TEST SUMMARY")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Errors: {errors}")
        print(f"📈 Success Rate: {passed/(passed+failed+errors)*100:.1f}%")
        
        return self.results

if __name__ == "__main__":
    tester = CoordinationTester()
    tester.run_all_tests()