#!/bin/bash

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "❌ Conda not found. Please install conda first."
    exit 1
fi

echo "==========================================="
echo "🔧 Setting up Conda environment for BikeNode"
echo "==========================================="

# Ask user what to name the environment
read -p "Enter name for conda environment [bikenode]: " env_name
env_name=${env_name:-bikenode}

echo "📦 Creating conda environment '$env_name' with Python 3.9..."
conda create -y -n $env_name python=3.9

echo "🔄 Activating environment..."
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate $env_name

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to activate conda environment."
    exit 1
fi

echo "📦 Installing required packages..."

# Install packages available in conda
echo "Installing core dependencies from conda..."
conda install -y selenium pandas requests

# Install additional packages with pip
echo "Installing additional dependencies with pip..."
pip install webdriver-manager beautifulsoup4 colorama tqdm lxml openpyxl python-dotenv

echo "✅ Setup complete!"
echo ""
echo "To activate this environment, run:"
echo "    conda activate $env_name"
echo ""
echo "To run the scraper:"
echo "    conda activate $env_name"
echo "    ./start.sh"
echo ""

# Ask if user wants to activate the environment now
read -p "Do you want to activate the environment and run the scraper now? (y/n): " run_now

if [[ $run_now == "y" || $run_now == "Y" ]]; then
    echo "Activating environment and running start.sh..."
    conda activate $env_name
    ./start.sh
else
    echo "You can activate the environment later with: conda activate $env_name"
fi
