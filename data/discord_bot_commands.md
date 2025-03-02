# BikeRole Discord Bot - Command Reference

This document contains a complete list of all commands available in the BikeRole Discord bot.

## Motorcycle Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!bike <query>` | Search for motorcycles matching the query | `!bike harley davidson sportster` |
| `!makes` | List all motorcycle manufacturers | `!makes` |
| `!models <make>` | List all models for a manufacturer | `!models Harley-Davidson` |
| `!packages <make> <model>` | List packages for a model | `!packages Honda CBR` |
| `!addbike <make> <model> <year> [package]` | Add a motorcycle role to your profile | `!addbike Honda CBR1000RR 2008` |
| `!mybikes` | Show all motorcycles in your profile | `!mybikes` |

## Bicycle Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!bicycle <query>` | Search for bicycles matching the query | `!bicycle trek madone` |
| `!bikemakes` | List all bicycle manufacturers | `!bikemakes` |
| `!bicyclemodels <make>` | List all models for a manufacturer | `!bicyclemodels Trek` |
| `!bicyclepackages <make> <model>` | List packages for a model | `!bicyclepackages Trek Madone` |
| `!addbicycle <make> <model> <year> [package]` | Add a bicycle role to your profile | `!addbicycle Trek Madone 2022 "SLR 9"` |
| `!mybicycles` | Show all bicycles in your profile | `!mybicycles` |

## Community Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!riders <query>` | Find members with bikes matching query | `!riders Trek` |
| `!vehiclestats` | Show statistics about bikes in the server | `!vehiclestats` |

## Tips for Using Commands

1. When adding bikes with multi-word packages, use quotes: `!addbicycle Trek Madone 2022 "SLR 9"` 

2. For searching, you can use partial terms: `!bike harley` will find all Harley-Davidson motorcycles

3. You can view other members' bikes by mentioning them: `!mybikes @username`

4. Some manufacturers might be listed under different spellings. If you can't find a specific make, try the `!makes` or `!bikemakes` command to see the exact spelling in the database.

## Role Colors

The bot automatically assigns colors to roles based on the vehicle category:

### Motorcycles
- **Red**: Sport/Supersport bikes
- **Green**: Touring bikes
- **Purple**: Cruiser/Custom bikes
- **Gold**: Enduro/Off-road bikes
- **Blue**: Other categories

### Bicycles
- **Red**: Road bikes
- **Gold**: Mountain bikes
- **Orange**: Gravel bikes
- **Green**: Hybrid bikes
- **Blue**: Other categories
