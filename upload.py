import csv
import json
from datetime import datetime

# Define the input and output file paths
input_csv_file = 'FINAL Inventory - Phys Comp Lab.csv'
output_json_file = 'processed_inventory_data1.json'

# Define the columns to extract from the original CSV
columns_to_extract = [
    'part_num', 'short_name', 'status', 'location', 'unit', 'min_quantity', 'max_quantity',
    'inventory1', 'inventory2', 'inventory3', 'inventory4', 'inventory5', 'inventory6',
    'inventory7', 'inventory8', 'inventory9', 'inventory10', 'inventory11', 'inventory12',
    'inventory13', 'inventory14', 'inventory15', 'inventory16', 'inventory17', 'inventory18',
    'inventory19', 'inventory20', 'back_stock1', 'back_stock2', 'back_stock3', 'back_stock4',
    'back_stock5', 'back_stock6', 'back_stock7', 'back_stock8', 'back_stock9', 'back_stock10',
    'back_stock11', 'back_stock12', 'back_stock13', 'back_stock14', 'back_stock15', 'back_stock16',
    'back_stock17', 'back_stock18', 'back_stock19', 'back_stock20', 'price_per', 'supplier', 'purchase_link'
]

# Read the original CSV and process the data
processed_data = []
with open(input_csv_file, 'r', newline='', encoding='utf-8') as csv_file:
    csv_reader = csv.DictReader(csv_file)
    
    # Skip the first 2 rows
    next(csv_reader)
    next(csv_reader)
    
    for row in csv_reader:
        processed_row = {
            'part_num': row['part_num'],
            'short_name': row['short_name'],
            'status': row['status'],
            'location': row['location'],
            'unit': row['unit'],
            'min_quantity': row['min_quantity'],
            'max_quantity': row['max_quantity'],
            'description': row['description']
        }

        # Process inventory history and backstock history
        inventory_history = {}
        backstock_history = {}
        bads = []
        for i in range(1, 21):
            inventory_key = f'inventory{i}'
            inventory_value = row[inventory_key]
            backstock_key = f'back_stock{i}'
            backstock_value = row[backstock_key]


            if inventory_value:
                components = inventory_value.split(':')
                if(len(components) == 2):
                    print(components)
                    if(components[0] == "lending"):
                        value = "0"
                    else:
                        value = int(components[0])
                    date_str = components[1]
                
                # if '/' in date_str:  # Handle date with separator (e.g., '6/7/18')
                #     year = int(date_str.split('/')[-1])
                #     if year < 50:  # Adjust for two-digit year conversion
                #         year += 2000
                #     else:
                #         year += 1900
                #     month, day = map(int, date_str.split('/')[:2])
                # else:  # Handle date without separator (e.g., '61918')
                #     year = int(date_str[-2:])
                #     if year < 50:  # Adjust for two-digit year conversion
                #         year += 2000
                #     else:
                #         year += 1900
                #     month = int(date_str[:-4])
                #     day = int(date_str[-4:-2])
                
            #     date_obj = datetime(year, month, day, 12, 0, 0)
            #     inventory_history[date_obj.strftime('%Y-%m-%d %H:%M:%S')] = value
                
            # if backstock_value:
            #     components = backstock_value.split(':')
            #     value = int(components[0])
            #     date_str = components[1]
                
            #     if '/' in date_str:  # Handle date with separator
            #         year = int(date_str.split('/')[-1])
            #         if year < 50:  # Adjust for two-digit year conversion
            #             year += 2000
            #         else:
            #             year += 1900
            #         month, day = map(int, date_str.split('/')[:2])
            #     else:  # Handle date without separator
            #         year = int(date_str[-2:])
            #         if year < 50:  # Adjust for two-digit year conversion
            #             year += 2000
            #         else:
            #             year += 1900
            #         month = int(date_str[:-4])
            #         day = int(date_str[-4:-2])
                
            #     date_obj = datetime(year, month, day, 12, 0, 0)
            #     backstock_history[date_obj.strftime('%Y-%m-%d %H:%M:%S')] = value

        processed_row['inventory history'] = inventory_history
        processed_row['backstock history'] = backstock_history

        # Process price history, supplier history, and purchase link history (as before)
        current_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        price_history = {current_date: row['price_per']}
        supplier_history = {current_date: row['supplier']}
        purchase_link_history = {current_date: row['purchase_link']}
        processed_row['price_history'] = price_history
        processed_row['supplier_history'] = supplier_history
        processed_row['purchase_link_history'] = purchase_link_history

        processed_data.append(processed_row)

# Write the processed data to a new JSON file
with open(output_json_file, 'w', encoding='utf-8') as json_file:
    json.dump(processed_data, json_file, indent=2)

print("Processed data has been written to", output_json_file)
