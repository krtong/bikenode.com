#!/bin/bash

# Cabin Motorcycles Test Runner
# This script helps run tests with proper environment setup

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load test environment variables
if [ -f "$DIR/.env.test" ]; then
    export $(cat "$DIR/.env.test" | xargs)
else
    echo -e "${YELLOW}Warning: .env.test not found. Using default environment.${NC}"
fi

# Function to check if PostgreSQL is available
check_postgres() {
    if [ -z "$TEST_DATABASE_URL" ]; then
        echo -e "${YELLOW}TEST_DATABASE_URL not set. Integration tests will be skipped.${NC}"
        return 1
    fi
    
    # Try to connect to the database
    if command -v psql &> /dev/null; then
        psql "$TEST_DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}PostgreSQL test database is available.${NC}"
            return 0
        else
            echo -e "${YELLOW}Cannot connect to test database. Integration tests will be skipped.${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}psql command not found. Cannot verify database connection.${NC}"
        return 1
    fi
}

# Function to run tests
run_tests() {
    local test_type="$1"
    local extra_args="${@:2}"
    
    echo -e "${GREEN}Running $test_type tests...${NC}"
    
    cd "$DIR"
    
    if [ "$test_type" = "all" ]; then
        npx jest $extra_args
    elif [ "$test_type" = "unit" ]; then
        npx jest unit/ $extra_args
    elif [ "$test_type" = "integration" ]; then
        if check_postgres; then
            npx jest integration/ $extra_args
        else
            echo -e "${RED}Skipping integration tests - database not available.${NC}"
            exit 1
        fi
    elif [ "$test_type" = "coverage" ]; then
        npx jest --coverage $extra_args
    elif [ "$test_type" = "watch" ]; then
        npx jest --watch $extra_args
    else
        echo -e "${RED}Unknown test type: $test_type${NC}"
        echo "Usage: $0 [all|unit|integration|coverage|watch] [additional jest args]"
        exit 1
    fi
}

# Main script
echo -e "${GREEN}=== Cabin Motorcycles Test Runner ===${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "$DIR/../node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Running npm install...${NC}"
    cd "$DIR/.."
    npm install
    cd "$DIR"
fi

# Default to running all tests if no argument provided
TEST_TYPE="${1:-all}"

# Check database connection for all tests or integration tests
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "integration" ]; then
    check_postgres
    echo ""
fi

# Run the tests
run_tests "$@"

# Exit with the test exit code
exit $?