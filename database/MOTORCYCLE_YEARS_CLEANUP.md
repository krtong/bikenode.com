# Motorcycle Years Data Cleanup

This directory contains scripts to clean up the motorcycle specs table, specifically focusing on normalizing the years data.

## Problem Summary

The motorcycle database has several issues with how years are stored:

1. **Year Ranges**: 29 specs contain year ranges like "1998-2001" stored as strings
2. **Over-shared Specs**: 34 specs are shared across 10+ years (some spanning decades)
3. **Year Mismatches**: Cases where motorcycles.year doesn't match motorcycle_specs.year
4. **Coverage Gaps**: 38,070 out of 42,123 motorcycles (90%) lack specifications
5. **Data Type Issues**: Year stored as TEXT in some places, INTEGER in others

## Scripts

### 1. `analyze_motorcycle_years.js`
Analyzes the current state of the database without making changes.

```bash
node analyze_motorcycle_years.js
```

### 2. `clean_motorcycle_years_safe.js`
Interactive cleanup script that shows preview and asks for confirmation.

```bash
node clean_motorcycle_years_safe.js
```

Features:
- Shows preview of changes before applying
- Creates timestamped backups
- Runs in a transaction (can rollback on error)
- Interactive confirmation prompts

### 3. `clean_motorcycle_years.js`
Automated cleanup script (use with caution).

```bash
node clean_motorcycle_years.js
```

### 4. `restore_motorcycle_backup.js`
Restore from a previous backup if needed.

```bash
node restore_motorcycle_backup.js
```

### 5. `verify_motorcycle_cleanup.js`
Verify the cleanup was successful.

```bash
node verify_motorcycle_cleanup.js
```

## Cleanup Process

The cleanup performs these operations:

1. **Create Backup Tables**
   - Creates timestamped copies of both tables
   - Format: `motorcycles_backup_YYYY-MM-DD-HH-mm-ss`

2. **Parse Year Ranges**
   - Finds entries with year ranges (e.g., "1998-2001")
   - Updates original spec to use start year
   - Creates new spec entries for each year in range
   - Preserves original range in `Year_Range` field

3. **Split Over-shared Specs**
   - Identifies specs shared across many years
   - Creates year-specific variants
   - Updates motorcycle records to use appropriate specs

4. **Fix Year Mismatches**
   - Finds motorcycles where year doesn't match spec year
   - Attempts to link to correct year-specific spec
   - Reports cases where no matching spec exists

5. **Add Validation Constraints**
   - Adds CHECK constraints for reasonable year range (1885-current+2)
   - Prevents future invalid data entry

## Usage Recommendations

1. **First Time**: Run the safe version with preview
   ```bash
   node analyze_motorcycle_years.js  # Check current state
   node clean_motorcycle_years_safe.js  # Interactive cleanup
   node verify_motorcycle_cleanup.js  # Verify results
   ```

2. **If Issues Occur**: Restore from backup
   ```bash
   node restore_motorcycle_backup.js
   ```

3. **Regular Maintenance**: Schedule periodic verification
   ```bash
   node verify_motorcycle_cleanup.js
   ```

## Expected Results

After cleanup:
- No year ranges in JSONB data
- Each spec linked to appropriate years only
- Consistent year data between tables
- Validation constraints prevent future issues

## Database Schema

### motorcycles table
```sql
id UUID PRIMARY KEY
year INTEGER NOT NULL
make TEXT NOT NULL
model TEXT NOT NULL
spec_id UUID REFERENCES motorcycle_specs(id)
```

### motorcycle_specs table
```sql
id UUID PRIMARY KEY
manufacturer TEXT NOT NULL
model TEXT NOT NULL
year INTEGER NOT NULL
specifications JSONB  -- Contains detailed specs
```

## Notes

- Always create backups before running cleanup
- The safe script runs in a transaction
- Verification script generates JSON reports
- Check constraints prevent years outside 1885-2027