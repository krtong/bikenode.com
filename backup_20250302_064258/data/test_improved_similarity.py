import re
from improved_model_similarity import find_common_parts, evaluate_package_candidate

def test_model_similarity():
    """
    Test the improved model similarity detection algorithm with known test cases.
    """
    test_cases = [
        # model1, model2, expected_base, expected_package, should_extract
        ("Tuono 1000 R", "Tuono 1000 R FACTORY", "Tuono 1000 R", "FACTORY", True),
        ("FLSTF Fat Boy", "FLSTFB Fat Boy Special", "Fat Boy", "Special", True),
        ("Monster 1100", "Monster 1100 S", "Monster 1100", "S", True),
        ("GSX-R1000", "GSX-R1000 ABS", "GSX-R1000", "ABS", True),
        ("V-Strom 650", "V-Strom 650 ABS", "V-Strom 650", "ABS", True),
        ("Boulevard C50", "Boulevard C50T", "Boulevard C50", "T", True),
        ("Bonneville", "Bonneville SE", "Bonneville", "SE", True),
        ("Hypermotard 1100 Evo", "Hypermotard 1100 Evo SP", "Hypermotard 1100 Evo", "SP", True),
        # Known problematic cases that should be handled correctly
        ("Monster 696", "Monster 796", "Monster", "", False),  # Different models, not package
        ("FZ1", "FZ6", "FZ", "", False),  # Different models, not package
        ("Street Triple", "Speed Triple", "Triple", "", False),  # Different models
        # Complex cases
        ("FLHTK Electra Glide Ultra Limited", "FLHTCUSE CVO Ultra Classic Electra Glide", "Electra Glide", "", False),
        ("Multistrada 1200", "Multistrada 1200 S", "Multistrada 1200", "S", True),
    ]
    
    print("Testing improved model similarity algorithm:\n")
    print("=" * 70)
    
    for model1, model2, expected_base, expected_package, should_extract in test_cases:
        # Test the find_common_parts function
        base_model, package, quality = find_common_parts(model1, model2)
        
        # Validate if the package should be extracted
        valid_package = evaluate_package_candidate(base_model, package, model1, model2) if package else False
        
        # Print results
        print(f"Model 1: {model1}")
        print(f"Model 2: {model2}")
        print(f"Detected base model: '{base_model}'")
        print(f"Detected package: '{package}'")
        print(f"Match quality: {quality:.2f}")
        print(f"Valid package: {valid_package}")
        
        # Check against expected results
        base_match = base_model.strip() == expected_base.strip()
        package_match = package.strip() == expected_package.strip()
        extract_match = valid_package == should_extract
        
        print(f"Base model match: {'✓' if base_match else '✗'}")
        print(f"Package match: {'✓' if package_match else '✗'}")
        print(f"Extract decision match: {'✓' if extract_match else '✗'}")
        print("-" * 70)

if __name__ == "__main__":
    test_model_similarity()
