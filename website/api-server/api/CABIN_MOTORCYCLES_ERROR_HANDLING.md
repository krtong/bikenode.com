# Cabin Motorcycles API - Error Handling Improvements

## Overview
This document outlines the comprehensive error handling improvements made to the cabin motorcycles API.

## Key Improvements

### 1. Structured Error Response
- Added `ErrorResponse` struct with:
  - `code`: Machine-readable error code
  - `message`: Human-friendly error message
  - `details`: Additional context for debugging

### 2. Error Codes
Defined consistent error codes:
- `DATABASE_ERROR`: Database operation failures
- `NOT_FOUND`: Resource not found
- `INVALID_INPUT`: Invalid request parameters
- `INTERNAL_SERVER_ERROR`: General server errors
- `CONNECTION_POOL_ERROR`: Database connection issues

### 3. Logging
- Added comprehensive logging for all errors
- Logs include context like query parameters and error details
- Non-critical errors logged without failing the request

### 4. Input Validation
- **Pagination**: Validates page and limit parameters
- **Year parameters**: Ensures years are within valid range (1900 to current year + 1)
- **Year range**: Validates that year_from is not greater than year_to
- **Subcategory**: Validates against allowed values (fully_enclosed, semi_enclosed)
- **Search query**: Validates length (2-100 characters)
- **ID parameter**: Ensures ID is not empty

### 5. Database Error Handling
- Checks for nil database connection
- Proper handling of `sql.ErrNoRows`
- Deferred cleanup with error logging
- Row iteration error checking

### 6. Response Handling
- Ensures arrays are never nil (empty arrays instead)
- Handles JSON encoding errors
- Sets proper Content-Type headers

### 7. HTTP Status Codes
- `400 Bad Request`: Invalid input parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server/database errors

## Example Error Responses

### Invalid Pagination
```json
{
  "code": "INVALID_INPUT",
  "message": "Invalid pagination parameters",
  "details": {
    "error": "invalid page parameter: must be greater than 0"
  }
}
```

### Resource Not Found
```json
{
  "code": "NOT_FOUND",
  "message": "Cabin motorcycle not found",
  "details": {
    "id": "123456"
  }
}
```

### Database Error
```json
{
  "code": "DATABASE_ERROR",
  "message": "Failed to fetch cabin motorcycles",
  "details": {
    "query": "main query",
    "error": "pq: connection refused"
  }
}
```

## Recovery Mechanisms
1. **Graceful degradation**: Partial data returned when possible
2. **Deferred cleanup**: Resources always cleaned up even on errors
3. **Default values**: Empty arrays instead of nil to prevent client errors
4. **Continued processing**: Single row errors don't fail entire query

## Usage Guidelines
- Always check response status code before parsing body
- Use error code for programmatic error handling
- Display message to users
- Include details in bug reports