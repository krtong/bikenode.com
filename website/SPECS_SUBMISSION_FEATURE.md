# Specs Submission Feature

This feature allows users to submit URLs to bike specifications when they encounter bikes with missing or incomplete data in the BikeNode database.

## How it Works

### User Experience
1. When viewing a bike in the "Add Bike" interface, if specifications are missing or incomplete, users will see an orange notice
2. The notice includes a "Submit Specs URL" button
3. Clicking the button opens a modal where users can:
   - Paste a URL to a page containing the bike's specifications
   - Add optional notes about the specs
4. Upon submission, users receive a confirmation message

### Technical Implementation

#### Frontend Components
- **Missing Specs Notice** (`/src/add-bike/components/specs-panel.njk`)
  - Shows when specs are incomplete
  - Contains the submit button
  
- **Submit Modal** (`/src/add-bike/components/display-panel.njk`)
  - Modal dialog for URL submission
  - Form with URL input and notes textarea

- **JavaScript Logic** (`/src/add-bike/js/specs-submission.js`)
  - `checkSpecsCompleteness()` - Detects missing specs
  - `openSubmitSpecsModal()` - Opens the submission modal
  - `submitSpecsURL()` - Handles form submission

#### Backend API
- **POST /api/specs-submissions** (`main.go`)
  - Accepts spec submission data
  - Logs to `specs_submissions.log`
  - Returns success response

- **GET /api/specs-submissions/list** (`main.go`)
  - Reads and parses the log file
  - Returns submissions in JSON format

#### Admin Interface
- **Specs Submissions Page** (`/src/admin/specs-submissions.njk`)
  - Available at `/admin/specs-submissions`
  - Shows all submitted specs URLs
  - Displays vehicle info, URL, notes, and timestamp

## Log Format

Submissions are logged to `specs_submissions.log` in the following format:

```
[2025-01-06T10:30:00Z] Specs Submission:
URL: https://example.com/bike-specs
Vehicle: bicycle Giant 2023 Defy Advanced 2
Notes: Found complete specs on manufacturer site
User-Agent: Mozilla/5.0...
---
```

## Detection Logic

The system considers specs incomplete when:
- Any spec value is missing, "N/A", "Not Available", "-", or empty
- The total number of specs is less than 5
- Critical fields like price, weight, or drivetrain are missing

## Security Considerations
- URLs are validated on the frontend
- Submissions are logged to a file (not directly to database)
- Manual review is required before importing specs
- User agent is logged for tracking potential abuse

## Future Enhancements
1. Database storage instead of log file
2. Automated spec extraction from submitted URLs
3. User accounts to track submissions
4. Moderation queue with approval workflow
5. Integration with web scraping to auto-populate specs

## Usage Instructions

### For Users
1. Navigate to any bike with missing specs
2. Click "Submit Specs URL" in the orange notice
3. Paste the URL and add any helpful notes
4. Submit the form

### For Administrators
1. Navigate to `/admin/specs-submissions`
2. Review submitted URLs
3. Manually verify and add specs to the database
4. The log file is at `website/specs_submissions.log`

## Files Modified/Created
- `/src/add-bike/components/specs-panel.njk` - Added missing specs notice
- `/src/add-bike/components/display-panel.njk` - Added submission modal
- `/src/add-bike/styles/add-bike.css` - Added styles for notice and modal
- `/src/add-bike/js/specs-submission.js` - New file with submission logic
- `/src/add-bike/js/app.js` - Import specs submission module
- `/src/add-bike/js/views.js` - Call completeness check
- `/main.go` - Added submission endpoints
- `/src/admin/specs-submissions.njk` - New admin page
- `/.gitignore` - Added log file to ignore list