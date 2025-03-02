import re
import difflib

def analyze_model_similarity(model1, model2):
    """
    Analyzes the similarity between two motorcycle model names.
    
    Args:
        model1 (str): First model name
        model2 (str): Second model name
        
    Returns:
        dict: Contains analysis results including common_part, package, base_model_match, package_match
    """
    # Special case for Harley-Davidson model codes
    harley_pattern = r'^(FLS|FLH|FLT|FXD|FXS|FXR|FXW|XL)[A-Z0-9-]+'
    hd_match1 = re.search(harley_pattern, model1)
    hd_match2 = re.search(harley_pattern, model2)
    
    if hd_match1 and hd_match2:
        # Extract Harley model codes for special handling
        code1 = hd_match1.group(0)
        code2 = hd_match2.group(0)
        # If the base code is the same, consider them the same model family
        if code1[:3] == code2[:3]:
            # Find the descriptive part after the model code
            desc1 = model1[len(code1):].strip()
            desc2 = model2[len(code2):].strip()
            
            # Find common parts in the descriptive text
            s = difflib.SequenceMatcher(None, desc1, desc2)
            common_part = ""
            for block in s.get_matching_blocks():
                if block.size > len(common_part):
                    common_part = desc1[block.a:block.a+block.size].strip()
            
            # Determine which has additional content
            if len(desc2) > len(desc1) and common_part in desc1:
                base_model = desc1
                package = desc2.replace(common_part, "").strip()
            else:
                base_model = desc2
                package = desc1.replace(common_part, "").strip()
                
            return {
                "common_part": common_part,
                "package": package,
                "base_model_match": common_part != "",
                "package_match": len(package) > 0 and (package in desc1 or package in desc2)
            }
    
    # Engine size pattern to distinguish between engine variants
    engine_pattern = r'\d{3,4}'
    engine1 = re.search(engine_pattern, model1)
    engine2 = re.search(engine_pattern, model2)
    
    # If both have engine sizes but they're different, they're different base models
    if engine1 and engine2 and engine1.group(0) != engine2.group(0):
        # Find common text before the engine size
        prefix_match = re.search(r'^(.*?)(?=\d{3,4})', model1)
        prefix = prefix_match.group(0) if prefix_match else ""
        
        return {
            "common_part": prefix.strip(),
            "package": "",
            "base_model_match": True,
            "package_match": False
        }
    
    # General case - find the largest common substring
    s = difflib.SequenceMatcher(None, model1, model2)
    match = s.find_longest_match(0, len(model1), 0, len(model2))
    
    if match.size > 3:  # Only consider matches of reasonable length
        common_part = model1[match.a:match.a+match.size].strip()
        
        # Determine the package part
        if len(model2) > len(model1):
            # Model2 has more info, so it might be the variant
            remaining = model2.replace(common_part, "").strip()
            base_model = model1
        else:
            # Model1 has more info, so it might be the variant
            remaining = model1.replace(common_part, "").strip()
            base_model = model2
            
        # Common suffixes that indicate packages/trims
        package_identifiers = ["ABS", "SE", "SP", "FACTORY", "S", "T", "Special"]
        
        # Check if the remaining part matches known package identifiers
        package = remaining
        package_match = False
        for identifier in package_identifiers:
            if identifier in remaining:
                package_match = True
                break
        
        return {
            "common_part": common_part,
            "package": package,
            "base_model_match": common_part != "",
            "package_match": package_match
        }
    
    # No significant similarity found
    return {
        "common_part": "",
        "package": "",
        "base_model_match": False,
        "package_match": False
    }
