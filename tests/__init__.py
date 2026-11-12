# Automated test suite package
#
# The suite verifies deterministic orchestration and governance behaviour, so it
# must never depend on live LLM availability or consume Gemini quota. Clearing
# the key here makes every LLM call take the *reported* deterministic fallback
# path, keeping tests fast and reproducible.
import os

os.environ["GEMINI_API_KEY"] = ""
