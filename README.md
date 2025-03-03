# Bikenode.com Project Repository

This repository contains multiple projects related to the Bikenode ecosystem:

## Project Structure

- **website/**
  - Bikenode.com splash page and website files
  - Frontend UI elements and assets
  
- **discord_bot/**
  - Bikerole Discord bot that allows users to select motorcycles and bicycles they own
  - Discord role attribution and commands
  
- **chrome_extension/**
  - Bikenode Chrome extension
  - Aggregates listings for bikes (motorcycles and bicycles) and component sales
  - Monitors both new and used markets
  
- **shared_data/**
  - Shared datasets used by multiple projects
  - Includes comprehensive databases of bicycles and motorcycles
  - Utility scripts for data scraping, processing and analysis
    - Tools to scrape 99spokes, BikeExchange, and other websites for bicycle specs
    - Tools to scrape CycleTrader, Craigslist, and other websites


## Getting Started

Each project has its own setup and running instructions in their respective directories.

## Data Files

The shared_data directory contains:

- Motorcycle datasets (historical and current models)
- Bicycle datasets
- Scraping utilities for data collection
- Data transformation and normalization tools

## Development

When working on a specific project, stick to its directory to maintain clear separation between components.

## Deployment

Each project has independent deployment processes:
- Website: Standard web deployment
- Discord Bot: Hosted bot service
- Chrome Extension: Published through Chrome Web Store
