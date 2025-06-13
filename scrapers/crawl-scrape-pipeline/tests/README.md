# Pipeline Conformance Tests

> **⚠️ Testing Principles**
> - Tests use real data samples, not synthetic test data
> - Verify actual behavior, not theoretical compliance
> - Document failures without hiding edge cases

This directory contains integration tests to verify that the crawl-scrape-pipeline conforms to the SCRAPING_PIPELINE_SPEC.md.

## Test Files

- `test_pipeline_conformance.py` - Tests directory structure, file outputs, and conformance rules
- `test_data_flow.py` - Tests that data flows correctly between pipeline steps

## Running Tests

```bash
# Run all tests
pytest tests/

# Run with verbose output
pytest tests/ -v

# Run specific test file
pytest tests/test_pipeline_conformance.py

# Run specific test
pytest tests/test_pipeline_conformance.py::TestPipelineConformance::test_directory_structure
```

## Test Coverage

The tests verify:

1. **Directory Structure** - All 15 steps exist with correct names
2. **File Outputs** - Each step produces expected output files
3. **Data Flow** - Each step reads from the correct input location
4. **No Cross-Folder Writes** - Scripts only write to their own directories
5. **Explicit Paths** - No use of config.dirs, only relative paths
6. **File Formats** - Output files match specification (CSV headers, NDJSON format, etc.)

## Adding New Tests

When adding new functionality to the pipeline:

1. Add test to verify the output format
2. Add test to verify the input source
3. Add test to verify no cross-folder writes
4. Update this README with the new test coverage