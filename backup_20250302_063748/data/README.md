# BikeRole Discord Bot

A specialized Discord bot that lets motorcycle and bicycle enthusiasts display their bikes as server roles.

## Overview

BikeRole gives your Discord server members the ability to:
- Search through a comprehensive database of motorcycles (1894-2025) and bicycles
- Add roles for the bikes they own
- Show off their collection to other members
- Discover what bikes other community members ride

## For Server Admins

Once BikeRole is added to your server, it automatically:
- Creates roles for bikes as members request them
- Maintains a database of thousands of motorcycles across hundreds of brands
- Provides an engaging way for your community to connect over shared rides

## Commands for Motorcycle Enthusiasts

- `!bike [query]` - Search for any motorcycle by name, make, model, or year
- `!makes` - See all available motorcycle brands in the database
- `!models [make]` - List all models for a specific manufacturer
- `!packages [make] [model]` - List all packages available for a specific model
- `!addbike [make] [model] [year] [package]` - Add a motorcycle to your profile as a role (package is optional)
- `!mybikes` - Display all motorcycles you currently have roles for

## Commands for Bicycle Enthusiasts

- `!bicycle [query]` - Search for any bicycle by name, make, model, or year
- `!bikemakes` - See all available bicycle brands in the database
- `!bicyclemodels [make]` - List all models for a specific manufacturer
- `!bicyclepackages [make] [model]` - List all packages available for a specific model
- `!addbicycle [make] [model] [year] [package]` - Add a bicycle to your profile as a role (package is optional)
- `!mybicycles` - Display all bicycles you currently have roles for

## Community Commands

- `!riders [query]` - Find all members who have bikes matching your query
- `!vehiclestats` - Show statistics about bikes in the community

## Examples

```
!bike harley davidson street glide
```
Search for Harley Davidson Street Glide motorcycles

```
!bicycle trek fuel
```
Search for Trek Fuel bicycles

```
!addbicycle Trek Madone 2022 "SLR 9"
```
Adds the "2022 Trek Madone SLR 9" bicycle role to your profile

```
!addbike Honda CBR1000RR 2008
```
Adds the "2008 Honda CBR1000RR" motorcycle role to your profile

## Community Building

BikeRole helps create connections in your motorcycle community:
- Members can identify others who ride the same brand or model
- Organize rides or events based on bike types
- Create custom channels for specific bike brands or styles
- Easily see what everyone rides without asking

## Database Coverage

The bot's vehicle database includes:
- Classic motorcycles from 1894-1949
- Modern motorcycles from 1950-2025
- Popular bicycles with their various component packages
- Support for thousands of models across hundreds of manufacturers
