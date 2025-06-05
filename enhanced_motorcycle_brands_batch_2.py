#!/usr/bin/env python3
import csv
import os

# Enhanced motorcycle brands data batch 2 - continuing with fascinating cultural notes
enhanced_brands_batch_2 = {
    'Aermacchi': {
        'Manufacturer': 'Aermacchi',
        'Official_Website': 'N/A',
        'Status': 'Defunct',
        'Country': 'Italy',
        'Years_Active': '1951-1978',
        'Last_Known_URL': 'N/A',
        'Notes': 'From Italian skies to racetracks - this aircraft manufacturer created some of the most beautiful and successful racing motorcycles ever built. Their horizontal single-cylinder engines powered Ala d\'Oro (Golden Wing) racers that dominated 250cc and 350cc world championships throughout the 1960s. Harley-Davidson bought them in 1960, creating the legendary Harley Sprint - the only Harley that could actually corner! For racing purists, Aermacchi represents Italian engineering poetry in motion.'
    },
    'Agrati': {
        'Manufacturer': 'Agrati',
        'Official_Website': 'N/A',
        'Status': 'Defunct',
        'Country': 'Italy',
        'Years_Active': '1958-1965',
        'Last_Known_URL': 'N/A',
        'Notes': 'Born in Italy\'s post-war scooter boom, Agrati created innovative small-wheel scooters that merged with Garelli to form one of Europe\'s most successful moped empires. Their Capri scooter was beloved by stylish Italians who wanted Vespa elegance with unique flair. Though short-lived, Agrati\'s design philosophy influenced the entire European scooter industry during the swinging sixties.'
    },
    'AJP': {
        'Manufacturer': 'AJP',
        'Official_Website': 'https://www.ajpmotorsport.com',
        'Status': 'Active',
        'Country': 'Portugal',
        'Years_Active': '1987-Present',
        'Last_Known_URL': 'https://www.ajpmotorsport.com',
        'Notes': 'Portugal\'s only motorcycle manufacturer has quietly become Europe\'s best-kept secret for serious enduro riding. AJP builds no-nonsense machines that excel in the punishing conditions of Portuguese backcountry racing. Their PR4 and PR7 models are stripped-down, purpose-built enduro weapons favored by riders who prioritize function over flash. For adventure riders seeking authentic European engineering without the premium price, AJP offers pure, undiluted riding experience.'
    },
    'AJS': {
        'Manufacturer': 'AJS',
        'Official_Website': 'https://www.ajsmotorcycles.co.uk',
        'Status': 'Active',
        'Country': 'United Kingdom',
        'Years_Active': '1912-Present',
        'Last_Known_URL': 'https://www.ajsmotorcycles.co.uk',
        'Notes': 'A.J. Stevens created motorcycles that epitomized British racing spirit - their "Boy Racer" became slang for young speed demons across Britain. The company that gave the world the immortal Porcupine V4 Grand Prix racer (so named for its spiky cylinder heads) now focuses on learner-friendly machines. Modern AJS keeps the flame alive for new riders discovering the joy of British motorcycling heritage, proving that legends never truly die.'
    },
    'AJW': {
        'Manufacturer': 'AJW',
        'Official_Website': 'N/A',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1926-1977',
        'Last_Known_URL': 'N/A',
        'Notes': 'A.J. Whelan\'s motorcycles were the everyman\'s British bike - honest, reliable machines built in Exeter for riders who couldn\'t afford Norton or Triumph but refused to compromise on quality. Their Fox model became legendary among British commuters for starting reliably every Monday morning, earning the company a reputation for building motorcycles that simply worked. In an era of temperamental British iron, AJW was the exception that proved the rule.'
    },
    'Alfer': {
        'Manufacturer': 'Alfer',
        'Official_Website': 'N/A',
        'Status': 'Defunct',
        'Country': 'Spain',
        'Years_Active': '1982-2011',
        'Last_Known_URL': 'N/A',
        'Notes': 'Barcelona\'s contribution to the trials riding revolution, Alfer built precise, competition-focused machines that Spanish riders used to dominate world trials championships. Their VR series trials bikes were known for telepathic handling and bulletproof reliability in the hands of trials legends. When Alfer closed, it marked the end of an era for Spanish trials excellence, though their engineering DNA lives on in modern Spanish trials machines.'
    },
    'Alldays': {
        'Manufacturer': 'Alldays',
        'Official_Website': 'N/A',
        'Status': 'Defunct',
        'Country': 'United Kingdom',
        'Years_Active': '1903-1915',
        'Last_Known_URL': 'N/A',
        'Notes': 'Alldays & Onions Pneumatic Engineering Company had possibly the most wonderfully British name in motorcycle history. These Birmingham pioneers built some of Britain\'s earliest production motorcycles, including innovative belt-drive systems and early experiments with variable transmissions. Their name became synonymous with British engineering ingenuity during the heroic age of motorcycling, when every ride was an adventure into the unknown.'
    },
    'Alligator': {
        'Manufacturer': 'Alligator',
        'Official_Website': 'https://allamericanracers.com',
        'Status': 'Active',
        'Country': 'United States',
        'Years_Active': '2002-Present',
        'Last_Known_URL': 'https://allamericanracers.com',
        'Notes': 'Dan Gurney\'s legendary All American Racers brought Formula 1 precision to American V-twin manufacturing. Each Alligator motorcycle is a hand-built masterpiece that costs more than most cars, featuring aerospace-grade materials and racing technology. For riders who want the ultimate expression of American motorcycle artistry, Alligator represents the pinnacle - where racing legend meets rolling sculpture.'
    },
    'Allstate': {
        'Manufacturer': 'Allstate',
        'Official_Website': 'N/A',
        'Status': 'Defunct',
        'Country': 'Austria/United States',
        'Years_Active': '1953-1970',
        'Last_Known_URL': 'N/A',
        'Notes': 'Sears sold these Austrian Puch motorcycles under the Allstate name, creating an unlikely bridge between American retail and European engineering. Suburban dads could buy a quality motorcycle while shopping for lawn mowers, democratizing motorcycling for middle America. The Allstate Cruisaire became a cult classic among vintage enthusiasts who appreciate its unique blend of Austrian engineering and American marketing ambition.'
    },
    'AlphaSports': {
        'Manufacturer': 'AlphaSports',
        'Official_Website': 'N/A',
        'Status': 'Unknown',
        'Country': 'USA',
        'Years_Active': '1990s-2000s',
        'Last_Known_URL': 'N/A',
        'Notes': 'A mysterious player in the American sport bike import game during the 1990s grey-market era, AlphaSports represented the Wild West period of motorcycle importing when small companies could rebadge Asian bikes for American consumption. Their story reflects the entrepreneurial spirit of riders who saw opportunities in the gaps between major manufacturers, creating temporary but passionate motorcycle communities around obscure brands.'
    }
}

print("Enhancing motorcycle brands database - Batch 2...")
print(f"Processing {len(enhanced_brands_batch_2)} brands...")

# Read the existing CSV
with open('./database/data/motorcycle_brands.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    existing_data = list(reader)
    headers = reader.fieldnames

# Update existing entries with enhanced data
updated_count = 0
for i, brand in enumerate(existing_data):
    if brand['Manufacturer'] in enhanced_brands_batch_2:
        # Update the existing entry with enhanced data
        existing_data[i] = enhanced_brands_batch_2[brand['Manufacturer']]
        updated_count += 1
        print(f"Enhanced: {brand['Manufacturer']}")

# Write the updated data back
with open('./database/data/motorcycle_brands.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=headers)
    writer.writeheader()
    writer.writerows(existing_data)

print(f"\nUpdated {updated_count} brands with enhanced information")
print("Continuing systematic enhancement of all motorcycle brands...")