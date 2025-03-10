# Motorcycle Comparison Commands

This module provides commands for comparing motorcycles side by side in the BikeNode Discord bot.

## Available Commands

### `!bike compare <bike1> vs <bike2>`

Compare two motorcycles side by side with detailed specifications and visual charts.

**Parameters:**
- `bike1`: The first motorcycle to compare (format: YEAR MAKE MODEL)
- `bike2`: The second motorcycle to compare (format: YEAR MAKE MODEL)

**Separators:**
The command supports the following separators between the two motorcycles:
- `vs` (e.g., `!bike compare Honda CBR1000RR vs Kawasaki Ninja ZX-10R`)
- `VS` (e.g., `!bike compare Honda CBR1000RR VS Kawasaki Ninja ZX-10R`)
- `versus` (e.g., `!bike compare Honda CBR1000RR versus Kawasaki Ninja ZX-10R`)

## Examples

### Basic Comparison

```
!bike compare 2023 Honda CBR1000RR vs 2023 Kawasaki Ninja ZX-10R
```

This command will:
1. Search for both motorcycles in the database
2. If multiple matches are found, prompt the user to select the specific models
3. Display a side-by-side comparison of the two motorcycles, including:
   - Basic specifications (year, make, model, category, engine)
   - A visual chart comparing engine sizes (if available)

### Handling Multiple Matches

If your search query matches multiple motorcycles, the bot will display a numbered list of matches and ask you to select one by typing the corresponding number.

For example:
```
Multiple matches found for '2023 Honda'
Please select a motorcycle by typing the number:

1. 2023 Honda CBR1000RR (SP)
   Category: sportbike, Engine: 999cc

2. 2023 Honda CB650R
   Category: naked, Engine: 649cc
```

You would then type `1` or `2` to select the specific motorcycle you want to compare.

## Implementation Details

The comparison command uses the motorcycle database to find and compare motorcycles. It extracts engine sizes from the engine specifications when available to create visual comparisons.

## Requirements

- discord.py
- pandas
- matplotlib

## Future Enhancements

Potential future enhancements for the comparison commands include:

1. **More Comparison Metrics**: Add more specifications to compare (weight, power, price, etc.)
2. **Multiple Bike Comparison**: Allow comparing more than two motorcycles at once
3. **Radar Charts**: Add radar charts to visualize multiple metrics at once
4. **User Preferences**: Allow users to specify which metrics they care about most
5. **Save Comparisons**: Allow users to save comparisons for future reference
6. **Image Integration**: Show images of the motorcycles being compared