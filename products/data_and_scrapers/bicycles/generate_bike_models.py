#!/usr/bin/env python3
"""
Generate data models and schemas for the bike data
"""
import os
import json
import csv
import sys
import argparse
from collections import Counter, defaultdict
from typing import List, Dict, Any, Optional
from pprint import pprint

def load_bike_data(filename):
    """Load bike data from CSV or JSON file"""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == '.csv':
        bikes = []
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    bikes.append(row)
            return bikes
        except Exception as e:
            print(f"Error reading CSV file: {e}")
            return None
    elif ext == '.json':
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading JSON file: {e}")
            return None
    else:
        print(f"Unsupported file extension: {ext}")
        return None

def analyze_schema(bikes):
    """Analyze the bike data to understand the schema"""
    if not bikes:
        return None, "No bike data found"
    
    # Collect all fields
    all_fields = set()
    field_types = {}
    field_presence = {}
    example_values = {}
    
    # Track specification fields separately
    spec_fields = set()
    
    for bike in bikes:
        # Process all fields
        for field, value in bike.items():
            all_fields.add(field)
            
            # Track how often each field appears
            field_presence[field] = field_presence.get(field, 0) + 1
            
            # Track field types (basic type inference)
            try:
                if not value or value.lower() == "null" or value.lower() == "n/a" or value.lower() == "none":
                    # Skip None/null values for type inference
                    continue
                
                if value.startswith('$') and any(c.isdigit() for c in value):
                    # Price field
                    inferred_type = "price"
                elif field == "year" and value.isdigit() and 1900 < int(value) < 2100:
                    # Year field
                    inferred_type = "integer"
                elif value.isdigit():
                    # Integer field
                    inferred_type = "integer"
                elif value.replace('.', '', 1).isdigit() and value.count('.') == 1:
                    # Float field
                    inferred_type = "float"
                else:
                    # String field
                    inferred_type = "string"
                
                # Update type tracking or detect conflicts
                if field not in field_types:
                    field_types[field] = inferred_type
                elif field_types[field] != inferred_type:
                    # Type conflict, fall back to string
                    if field_types[field] != "mixed":
                        field_types[field] = "mixed"
                
                # Store example value if we don't have one yet
                if field not in example_values and value:
                    example_values[field] = value
                    
                # Track specification fields
                if field.startswith("spec_"):
                    spec_fields.add(field)
            except:
                field_types[field] = "string"
    
    # Calculate field coverage percentage
    total_bikes = len(bikes)
    field_coverage = {field: (count / total_bikes) * 100 for field, count in field_presence.items()}
    
    # Generate schema report
    schema_info = {
        "total_bikes": total_bikes,
        "total_fields": len(all_fields),
        "specification_fields": len(spec_fields),
        "fields": [],
        "example_bike": bikes[0] if bikes else None
    }
    
    # Add field details
    for field in sorted(all_fields):
        schema_info["fields"].append({
            "name": field,
            "type": field_types.get(field, "unknown"),
            "coverage": field_coverage.get(field, 0),
            "count": field_presence.get(field, 0),
            "example": example_values.get(field, "")
        })
    
    return schema_info, None

def generate_typescript_interface(schema_info):
    """Generate TypeScript interface from schema"""
    ts_code = "// TypeScript interface for bike data\n"
    ts_code += "interface Bike {\n"
    
    # Helper to map types to TypeScript types
    type_map = {
        "string": "string",
        "integer": "number",
        "float": "number",
        "price": "string",  # Keep prices as strings since they have currency symbols
        "mixed": "any",
        "unknown": "any"
    }
    
    # Add fields with types
    for field in schema_info["fields"]:
        name = field["name"]
        field_type = type_map.get(field["type"], "any")
        
        # Make fields optional if coverage is less than 95%
        is_optional = field["coverage"] < 95
        
        ts_type = field_type + ("" if field["coverage"] == 100 else " | null")
        ts_code += f"  {name}{'' if is_optional else '?'}: {ts_type};\n"
    
    ts_code += "}\n"
    
    # Add specification interface
    ts_code += "\n// Interface for specification fields\n"
    ts_code += "interface BikeSpecifications {\n"
    
    spec_fields = [f for f in schema_info["fields"] if f["name"].startswith("spec_")]
    
    for field in spec_fields:
        # Remove spec_ prefix for cleaner interface
        name = field["name"].replace("spec_", "")
        ts_code += f"  {name}?: string;\n"
    
    ts_code += "}\n"
    
    return ts_code

def generate_python_class(schema_info):
    """Generate Python class from schema"""
    py_code = "# Python class for bike data\n"
    py_code += "from typing import Dict, List, Optional, Any, Union\n"
    py_code += "from dataclasses import dataclass\n\n"
    
    # Helper to map types to Python types
    type_map = {
        "string": "str",
        "integer": "int",
        "float": "float",
        "price": "str",
        "mixed": "Any",
        "unknown": "Any"
    }
    
    # Add specification dataclass
    py_code += "@dataclass\n"
    py_code += "class BikeSpecifications:\n"
    spec_fields = [f for f in schema_info["fields"] if f["name"].startswith("spec_")]
    
    if spec_fields:
        for field in spec_fields:
            # Remove spec_ prefix for cleaner class
            name = field["name"].replace("spec_", "")
            py_code += f"    {name}: Optional[str] = None\n"
    else:
        py_code += "    pass\n"
    
    py_code += "\n\n"
    
    # Add main bike dataclass
    py_code += "@dataclass\n"
    py_code += "class Bike:\n"
    
    # Add fields with types
    non_spec_fields = [f for f in schema_info["fields"] if not f["name"].startswith("spec_")]
    
    for field in non_spec_fields:
        name = field["name"]
        field_type = type_map.get(field["type"], "Any")
        
        # Make fields optional if coverage is less than 100%
        if field["coverage"] < 100:
            py_code += f"    {name}: Optional[{field_type}] = None\n"
        else:
            py_code += f"    {name}: {field_type}\n"
    
    # Add specifications field
    py_code += "    specifications: Optional[BikeSpecifications] = None\n"
    
    return py_code

def generate_sql_schema(schema_info):
    """Generate SQL schema from bike data"""
    sql_code = "-- SQL schema for bike data\n"
    sql_code += "CREATE TABLE bikes (\n"
    sql_code += "    id INTEGER PRIMARY KEY AUTOINCREMENT,\n"
    
    # Helper to map types to SQL types
    type_map = {
        "string": "TEXT",
        "integer": "INTEGER",
        "float": "REAL",
        "price": "TEXT",  # Keep prices as text since they have currency symbols
        "mixed": "TEXT",
        "unknown": "TEXT"
    }
    
    # Add non-specification fields
    non_spec_fields = [f for f in schema_info["fields"] if not f["name"].startswith("spec_")]
    
    for i, field in enumerate(non_spec_fields):
        name = field["name"]
        field_type = type_map.get(field["type"], "TEXT")
        
        sql_code += f"    {name} {field_type}"
        if i < len(non_spec_fields) - 1:
            sql_code += ",\n"
    
    sql_code += "\n);\n\n"
    
    # Create specifications table
    sql_code += "CREATE TABLE bike_specifications (\n"
    sql_code += "    id INTEGER PRIMARY KEY AUTOINCREMENT,\n"
    sql_code += "    bike_id INTEGER NOT NULL,\n"
    
    # Add specification fields
    spec_fields = [f for f in schema_info["fields"] if f["name"].startswith("spec_")]
    
    for i, field in enumerate(spec_fields):
        name = field["name"].replace("spec_", "")  # Remove spec_ prefix
        sql_code += f"    {name} TEXT"
        
        if i < len(spec_fields) - 1:
            sql_code += ",\n"
        else:
            sql_code += ",\n    FOREIGN KEY (bike_id) REFERENCES bikes(id)"
    
    sql_code += "\n);\n"
    
    return sql_code

def generate_json_schema(schema_info):
    """Generate JSON schema from bike data"""
    json_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Bike",
        "type": "object",
        "properties": {},
        "required": []
    }
    
    # Helper to map types to JSON schema types
    type_map = {
        "string": {"type": "string"},
        "integer": {"type": "integer"},
        "float": {"type": "number"},
        "price": {"type": "string", "pattern": "^\\$[0-9,.]+$"},
        "mixed": {"type": ["string", "number", "boolean"]},
        "unknown": {}
    }
    
    # Add properties based on fields
    for field in schema_info["fields"]:
        name = field["name"]
        field_type = field["type"]
        
        # Create property
        json_schema["properties"][name] = dict(type_map.get(field_type, {"type": "string"}))
        
        # Add example if available
        if field["example"]:
            json_schema["properties"][name]["examples"] = [field["example"]]
        
        # Add field to required list if it has 100% coverage
        if field["coverage"] == 100:
            json_schema["required"].append(name)
    
    # Create nested schema for specifications
    specs_schema = {
        "type": "object",
        "properties": {},
        "required": []
    }
    
    spec_fields = [f for f in schema_info["fields"] if f["name"].startswith("spec_")]
    for field in spec_fields:
        clean_name = field["name"].replace("spec_", "")
        specs_schema["properties"][clean_name] = {"type": "string"}
        if field["example"]:
            specs_schema["properties"][clean_name]["examples"] = [field["example"]]
    
    # Add specifications schema as a nested property
    json_schema["properties"]["specifications"] = specs_schema
    
    return json_schema

def generate_mongodb_schema(schema_info):
    """Generate MongoDB schema validation"""
    mongo_schema = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": [],
            "properties": {}
        }
    }
    
    # Map types to MongoDB BSON types
    type_map = {
        "string": "string",
        "integer": "int",
        "float": "double",
        "price": "string",
        "mixed": ["string", "int", "double", "bool"],
        "unknown": ["string", "int", "double", "bool", "object"]
    }
    
    # Add properties
    for field in schema_info["fields"]:
        name = field["name"]
        field_type = field["type"]
        
        # Only add required fields that have 100% coverage
        if field["coverage"] == 100:
            mongo_schema["$jsonSchema"]["required"].append(name)
        
        # Set up basic property structure
        mongo_schema["$jsonSchema"]["properties"][name] = {
            "bsonType": type_map.get(field_type, "string")
        }
        
        # Add description from example if available
        if field["example"]:
            mongo_schema["$jsonSchema"]["properties"][name]["description"] = f"Example: {field['example']}"
    
    # Create index recommendations
    indexes = [
        {"key": {"year": 1, "brand": 1, "model": 1}, "name": "year_brand_model", "unique": True},
        {"key": {"brand": 1}, "name": "brand_idx"},
        {"key": {"year": 1}, "name": "year_idx"},
        {"key": {"type": 1}, "name": "type_idx"}
    ]
    
    return mongo_schema, indexes

def save_schemas_to_files(schema_info, output_dir="bike_models"):
    """Save all generated schemas to files"""
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate TypeScript interface
    ts_code = generate_typescript_interface(schema_info)
    with open(os.path.join(output_dir, "bike.interface.ts"), "w", encoding="utf-8") as f:
        f.write(ts_code)
    
    # Generate Python class
    py_code = generate_python_class(schema_info)
    with open(os.path.join(output_dir, "bike_model.py"), "w", encoding="utf-8") as f:
        f.write(py_code)
    
    # Generate SQL schema
    sql_code = generate_sql_schema(schema_info)
    with open(os.path.join(output_dir, "bike_schema.sql"), "w", encoding="utf-8") as f:
        f.write(sql_code)
    
    # Generate JSON schema
    json_schema = generate_json_schema(schema_info)
    with open(os.path.join(output_dir, "bike_schema.json"), "w", encoding="utf-8") as f:
        json.dump(json_schema, f, indent=2)
    
    # Generate MongoDB schema
    mongo_schema, indexes = generate_mongodb_schema(schema_info)
    with open(os.path.join(output_dir, "bike_mongo_schema.json"), "w", encoding="utf-8") as f:
        json.dump({"schema": mongo_schema, "indexes": indexes}, f, indent=2)
    
    print(f"\nAll schemas generated and saved to {output_dir}/ directory:")
    print(f"- TypeScript interface: bike.interface.ts")
    print(f"- Python class: bike_model.py")
    print(f"- SQL schema: bike_schema.sql")
    print(f"- JSON schema: bike_schema.json")
    print(f"- MongoDB schema: bike_mongo_schema.json")

def main():
    parser = argparse.ArgumentParser(description="Generate data models from bike data")
    parser.add_argument("file", help="CSV or JSON file containing bike data")
    parser.add_argument("--output", default="bike_models", help="Output directory for generated models")
    args = parser.parse_args()
    
    # Load bike data
    print(f"Loading bike data from {args.file}...")
    bikes = load_bike_data(args.file)
    
    if not bikes:
        print("Error: No bike data loaded")
        return 1
    
    # Analyze schema
    print(f"Analyzing schema from {len(bikes)} bikes...")
    schema_info, error = analyze_schema(bikes)
    
    if error:
        print(f"Error analyzing schema: {error}")
        return 1
    
    # Generate and save schemas
    print(f"Generating data models...")
    save_schemas_to_files(schema_info, args.output)
    
    print(f"\nSchema analysis summary:")
    print(f"- Total bikes: {schema_info['total_bikes']}")
    print(f"- Total fields: {schema_info['total_fields']}")
    print(f"- Specification fields: {schema_info['specification_fields']}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())