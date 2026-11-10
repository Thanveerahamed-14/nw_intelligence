"""
One-click Automated Test Runner.
Executes the full test suite and prints a detailed test execution summary.
"""

import unittest
import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

def run_all_tests():
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir="tests", pattern="test_*.py")
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if result.wasSuccessful():
        print("\n" + "=" * 50)
        print("🎉 ALL TESTS PASSED SUCCESSFULLY!")
        print("=" * 50)
        sys.exit(0)
    else:
        print("\n" + "=" * 50)
        print(f"❌ TESTS FAILED: {len(result.failures)} failures, {len(result.errors)} errors")
        print("=" * 50)
        sys.exit(1)

if __name__ == "__main__":
    run_all_tests()

