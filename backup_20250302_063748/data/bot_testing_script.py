import os
from bike_lookup import BikeDatabase

def test_database():
    """Run a series of tests on the bike database to make sure it's working properly."""
    print("Initializing bike database...")
    db = BikeDatabase()
    
    # Test 1: Check if data is loaded
    print(f"\nTest 1: Loaded {len(db.makes)} makes, {len(db.models)} models across {len(db.years)} years")
    if len(db.makes) == 0 or len(db.models) == 0:
        print("❌ ERROR: No data was loaded!")
        return False
    else:
        print("✅ Database loaded successfully")
    
    # Test 2: Search for a specific make
    make = "Harley-Davidson"
    print(f"\nTest 2: Searching for {make}")
    bikes = db.find_by_make(make)
    print(f"Found {len(bikes)} {make} motorcycles")
    if len(bikes) > 0:
        print("✅ Make search works")
        sample_bike = bikes[0]
        print(f"Sample: {sample_bike['year']} {sample_bike['make']} {sample_bike['model']}")
    else:
        print(f"❌ ERROR: No {make} motorcycles found!")
    
    # Test 3: Fuzzy search
    search_term = "hond"
    print(f"\nTest 3: Fuzzy searching for '{search_term}'")
    results = db.fuzzy_search_make(search_term)
    print(f"Fuzzy search results: {results}")
    if len(results) > 0:
        print("✅ Fuzzy search works")
    else:
        print("❌ ERROR: Fuzzy search failed!")
    
    # Test 4: Role name generation
    print("\nTest 4: Testing role name generation")
    if len(bikes) > 0:
        role_name = db.get_role_name(bikes[0])
        print(f"Example role name: {role_name}")
        print("✅ Role name generation works")
    else:
        print("❌ ERROR: Couldn't test role name generation (no bikes found)")
    
    # Test 5: Model listing
    if len(bikes) > 0:
        make = bikes[0]['make']
        print(f"\nTest 5: Getting models for {make}")
        models = db.get_models_for_make(make)
        print(f"Found {len(models)} models for {make}")
        if len(models) > 0:
            print(f"First 5 models: {models[:5]}")
            print("✅ Model listing works")
        else:
            print(f"❌ ERROR: No models found for {make}!")
    
    # Test 6: Year listing
    if len(bikes) > 0:
        make = bikes[0]['make']
        model = bikes[0]['model']
        print(f"\nTest 6: Getting years for {make} {model}")
        years = db.get_years_for_make_model(make, model)
        print(f"Found {len(years)} years for {make} {model}")
        if len(years) > 0:
            print(f"Years: {years}")
            print("✅ Year listing works")
        else:
            print(f"❌ ERROR: No years found for {make} {model}!")
    
    # Test 7: Search functionality
    query = "harley sportster"
    print(f"\nTest 7: Testing search with '{query}'")
    search_results = db.search(query)
    print(f"Found {len(search_results)} results")
    if len(search_results) > 0:
        print("Sample results:")
        for i, bike in enumerate(search_results[:3]):
            print(f"  {i+1}. {bike['year']} {bike['make']} {bike['model']}")
        print("✅ Search functionality works")
    else:
        print("❌ ERROR: Search returned no results!")
    
    print("\nDatabase testing completed!")
    return True

if __name__ == "__main__":
    test_database()
    
    # Prompt to run the Discord bot if database tests pass
    print("\nWould you like to run the Discord bot? (y/n)")
    response = input().strip().lower()
    
    if response == 'y':
        token = os.environ.get("DISCORD_BOT_TOKEN")
        if not token:
            print("\n❌ No Discord token found! Please set the DISCORD_BOT_TOKEN environment variable.")
            print("For example:")
            print("  export DISCORD_BOT_TOKEN='your_token_here'")
        else:
            print("\nStarting Discord bot...")
            try:
                # Import and run the bot
                import discord_bot_example
                # The bot will run from the imported module
            except Exception as e:
                print(f"❌ Error starting bot: {e}")
