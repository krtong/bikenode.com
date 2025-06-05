#!/usr/bin/env python3

import csv
import sqlite3
import os

def update_sqlite_database():
    """Simple script to update SQLite database from CSV"""
    
    # Paths
    csv_path = "/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles_updated.csv"
    db_path = "/Users/kevintong/Documents/Code/bikenode.com/database/data/motorcycles.db"
    
    print(f"Updating SQLite database at {db_path} from CSV at {csv_path}")
    
    # Create SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Drop and recreate table to ensure clean update
    cursor.execute('DROP TABLE IF EXISTS motorcycles')
    cursor.execute('''
        CREATE TABLE motorcycles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER,
            make TEXT,
            model TEXT,
            package TEXT,
            category TEXT,
            engine TEXT
        )
    ''')
    
    # Read CSV and insert into database
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cursor.execute(
                "INSERT INTO motorcycles (year, make, model, package, category, engine) VALUES (?, ?, ?, ?, ?, ?)",
                (row['Year'], row['Make'], row['Model'], row['Package'], row['Category'], row['Engine'])
            )
    
    # Commit changes and close connection
    conn.commit()
    
    # Verify the update by counting 2025 Ducati entries
    cursor.execute("SELECT COUNT(*) FROM motorcycles WHERE year = 2025 AND make = 'Ducati'")
    ducati_count = cursor.fetchone()[0]
    print(f"Database updated successfully. Found {ducati_count} 2025 Ducati entries.")
    
    conn.close()

if __name__ == "__main__":
    update_sqlite_database()
