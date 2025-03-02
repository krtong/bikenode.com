from setuptools import setup, find_packages

setup(
    name="bikenode",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "selenium>=4.9.0",
        "webdriver-manager>=3.8.6", 
        "pandas>=1.5.0",
        "requests>=2.28.2",
        "beautifulsoup4>=4.11.1"
    ],
    python_requires='>=3.7',
)
