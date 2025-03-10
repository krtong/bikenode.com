# Motorcycle Statistics Commands

This module provides commands for displaying statistics about motorcycles in the BikeNode database.

## Available Commands

### `!bike stats [type]`

Display motorcycle statistics based on the specified type.

**Parameters:**
- `type` (optional): The type of statistics to display. Options are:
  - `brands` (default): Display statistics about motorcycle brands
  - `categories`: Display statistics about motorcycle categories
  - `years`: Display statistics about motorcycle model years

## Examples

### Brand Statistics

```
!bike stats brands
```

This command displays:
- A bar chart showing the top 10 motorcycle brands by count
- The total number of brands in the database
- A list of the top brands with their model counts

### Category Statistics

```
!bike stats categories
```

This command displays:
- A pie chart showing the distribution of motorcycle categories
- The total number of categories in the database
- A list of the top categories with their model counts and percentages

### Year Statistics

```
!bike stats years
```

This command displays:
- A line chart showing the number of motorcycle models by year (last 15 years)
- The full year range in the database
- Information about the oldest and newest models in the database

## Implementation Details

The statistics commands use the pandas library to analyze the motorcycle data and matplotlib to generate visualizations. The visualizations are sent as Discord embeds with attached images.

## Requirements

- discord.py
- pandas
- matplotlib

## Future Enhancements

Potential future enhancements for the statistics commands include:

1. **Interactive Charts**: Allow users to interact with the charts (e.g., filter by year range)
2. **Comparison Charts**: Compare statistics between different brands or categories
3. **Engine Size Analysis**: Show distribution of engine sizes across different categories
4. **Price Analysis**: Show price ranges for different types of motorcycles
5. **User-Specific Stats**: Show statistics about the motorcycles owned by users in the server