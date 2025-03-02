#!/bin/bash

echo "====================================================="
echo "🔧 Installing dependencies in Conda environment 🔧"
echo "====================================================="

# Install required packages using conda first
echo "📦 Installing selenium and other packages with conda..."
conda install -y selenium pandas requests

# Install additional packages with pip (through conda)
echo "📦 Installing additional packages with pip..."
pip install webdriver-manager beautifulsoup4

echo "🌐 Verifying selenium installation..."
python -c "import selenium; print(f'Selenium version: {selenium.__version__}')"

echo ""
echo "✅ Setup complete! You can now run the scraper with:"
echo "   python run_scraper.py"
echo ""
echo "💡 If you still encounter issues, try creating a new conda environment:"
echo ""
echo "   conda create -n bike_scraper python=3.9"
echo "   conda activate bike_scraper"
echo "   ./install_dependencies.sh"
