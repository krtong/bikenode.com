from model_similarity import analyze_model_similarity

def test_model_similarity():
    test_cases = [
        ("Tuono 1000 R", "Tuono 1000 R FACTORY"),
        ("FLSTF Fat Boy", "FLSTFB Fat Boy Special"),
        ("Monster 1100", "Monster 1100 S"),
        ("GSX-R1000", "GSX-R1000 ABS"),
        ("V-Strom 650", "V-Strom 650 ABS"),
        ("Boulevard C50", "Boulevard C50T"),
        ("Bonneville", "Bonneville SE"),
        ("Hypermotard 1100 Evo", "Hypermotard 1100 Evo SP"),
        ("Monster 696", "Monster 796"),
    ]
    
    print("Testing similar model name analysis:\n")
    
    for model1, model2 in test_cases:
        result = analyze_model_similarity(model1, model2)
        
        print(f"Model 1: {model1}")
        print(f"Model 2: {model2}")
        print(f"Common part: '{result['common_part']}'")
        print(f"Extracted package: '{result['package']}'")
        print(f"Base model match: {'✓' if result['base_model_match'] else '✗'}")
        print(f"Package match: {'✓' if result['package_match'] else '✗'}")
        print("-" * 50)

if __name__ == "__main__":
    test_model_similarity()
