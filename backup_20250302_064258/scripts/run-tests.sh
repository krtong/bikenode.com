#!/bin/bash

# Make script exit on first error
set -e

# Create directory if it doesn't exist
mkdir -p $(dirname "$0")

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}BikeNode Test Runner${NC}"
echo "------------------------"

# Parse command line arguments
TEST_TYPE="all"
WATCH_MODE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -t|--type) TEST_TYPE="$2"; shift ;;
        -w|--watch) WATCH_MODE=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Function to run tests with specific config
run_tests() {
    local config=$1
    local test_pattern=$2
    local watch_flag=""
    
    if [ "$WATCH_MODE" = true ]; then
        watch_flag="--watch"
    fi
    
    echo -e "${GREEN}Running tests with config: ${config}${NC}"
    if [ -z "$test_pattern" ]; then
        npx jest --config $config $watch_flag
    else
        npx jest --config $config $test_pattern $watch_flag
    fi
}

case "$TEST_TYPE" in
    all)
        echo "Running all tests"
        run_tests jest.config.js
        run_tests jest.e2e.config.js
        ;;
    unit)
        echo "Running unit tests"
        run_tests jest.config.js
        ;;
    e2e)
        echo "Running end-to-end tests"
        run_tests jest.e2e.config.js
        ;;
    llm)
        echo "Running LLM parser tests"
        run_tests jest.config.js "__tests__/llmParser.test.js"
        ;;
    validation)
        echo "Running validation tests"
        run_tests jest.config.js "__tests__/validation/listingValidation.test.js"
        ;;
    content)
        echo "Running content extraction tests"
        run_tests jest.e2e.config.js "__tests__/contentExtraction.test.js"
        ;;
    *)
        echo -e "${RED}Unknown test type: ${TEST_TYPE}${NC}"
        echo "Available types: all, unit, e2e, llm, validation, content"
        exit 1
        ;;
esac

echo -e "${GREEN}All tests completed!${NC}"
