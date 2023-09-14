import csv
import datetime
import json
import string

log_message = ""

def parse_col_normal(data, linedata, field, og_field='', required=False, default_val=''):
  global log_message

  if len(og_field) == 0:
    og_field = field

  actual_data = linedata[og_field]
  if len(actual_data) == 0:
    if required:
      data[field] = default_val

    # o.w skip field for not existing
    return data

  data[field] = actual_data
  return data

def parse_col_dictionary(data, linedata, field, og_field):
  global log_message

  dictionary = {}
  i = 1
  col_name = og_field + str(i)
  while col_name in linedata:
    cell = linedata[col_name]

    if len(cell) == 0:
      i += 1
      col_name = og_field + str(i)
      continue

    cellSplit = cell.split(":")
    if len(cellSplit) != 2:
      # malformed cell; skip
      log_message += f"Malformed cell split: could not find both count and date on item #{linedata['part_num']} {col_name} : {cell}\n"

      i += 1
      col_name = og_field + str(i)
      continue
    
    count, date = cellSplit

    if not count.isdigit():
      count = "0"

    # format date
    date = date.strip()
    split_date = date.split("/")

    if len(split_date) != 3 or not (split_date[0].isdigit() and split_date[1].isdigit() and split_date[2].isdigit()):
      # malformed date; skip
      log_message += f"Malformed date split: date is improperly formatted on item #{linedata['part_num']} {col_name} : {date}\n"

      i += 1
      col_name = og_field + str(i)
      continue

    month = int(split_date[0])
    day = int(split_date[1])
    year = int(split_date[2])

    if year < 2000:
      year += 2000

    date_real = datetime.datetime(year, month, day)
    date_formatted = date_real.strftime("%Y-%m-%d %H:%M:%S")

    dictionary[date_formatted] = count

    i += 1
    col_name = og_field + str(i)
  
  if len(dictionary) == 0:
    now_formatted = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    data[field] = { now_formatted : "-1" }
  else:
    data[field] = dictionary

  return data


data_arr = []
brokenLines = []
firstLine = True
lineNum = 0
with open('data.csv', newline='') as csvfile:
  csvreader = csv.DictReader(csvfile)
  for currentLine in csvreader:
    lineNum += 1

    if firstLine:
      # skip first line of column descriptions
      firstLine = False
      continue

    # Process the current line
    data = {}
    currentLine['price_per'] = currentLine['price_per'].replace("$", "")
    currentLine['price_per'] = currentLine['price_per'].replace(",", "")
    currentLine['price_per'] = currentLine['price_per'].strip()

    ### Required Fields
    # *part_num: Listed as part_num in the CSV
    # *short_name: Listed as short_name in the CSV
    # *status: either Active, Currently Unavailable, To Discontinue, or Discontinued. Listed as status
    # *location: Listed as location
    # *unit: Listed as unit
    data = parse_col_normal(data, currentLine, "part_num")

    if "part_num" not in data:
      log_message += f"No Part Number: Skipping row {lineNum}\n"
      continue

    data = parse_col_normal(data, currentLine, "short_name", required=True)
    data = parse_col_normal(data, currentLine, "status", required=True, default_val="Active")
    data = parse_col_normal(data, currentLine, "location", required=True, default_val="no location")
    data = parse_col_normal(data, currentLine, "unit", required=True, default_val="each")

    if len(data["part_num"]) == 0 and len(data["short_name"]) == 0 and len(data["status"]) == 0 and len(data["location"]) == 0 and len(data["unit"]) == 0:
      # empty row - skip
      continue

    data["status"] = string.capwords(data["status"])

    # description: Listed as description
    # min_quantity: Listed as min_quantity
    # max_quantity: Listed as max_quantity
    # supplier_part_num: Listed as supplier_part_num
    # label_text: Listed as label_text
    data = parse_col_normal(data, currentLine, "description")
    data = parse_col_normal(data, currentLine, "min_quantity")
    data = parse_col_normal(data, currentLine, "max_quantity")
    data = parse_col_normal(data, currentLine, "supplier_part_num", og_field="supplier_part_number")
    data = parse_col_normal(data, currentLine, "label_text")

    if "min_quantity" in data and not data["min_quantity"].isdigit():
      data["min_quantity"] = "0"
    if "max_quantity" in data and not data["max_quantity"].isdigit():
      data["max_quantity"] = "0"

    # inventory_history: a JSON thing that has key = date as string as "YYYY-MM-DD HH:MM:SS" and value as the inventory number in a string for that date. You will have to create an inventory history for each part by parsing and combining the values from each of the inventory1, inventory2, inventory3,... columns
    # backstock_history: same as above but with backstock
    data = parse_col_dictionary(data, currentLine, "inventory_history", "inventory")
    data = parse_col_dictionary(data, currentLine, "backstock_history", "back_stock")
    
    # price_history: same as above, but there's only one price (Listed as price_per). Just take today's date
    # supplier_history: same as price. Listed as supplier. Use today's date
    # purchase_link_history: same as price. Listed as purchase_link. Use today's date.
    data = parse_col_normal(data, currentLine, "price_history", "price_per")
    data = parse_col_normal(data, currentLine, "supplier_history", "supplier")
    data = parse_col_normal(data, currentLine, "purchase_link_history", "purchase_link")
    
    now_formatted = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if "price_history" in data:
      data["price_history"] = { now_formatted : data["price_history"] }
    
    if "supplier_history" in data:
      data["supplier_history"] = { now_formatted : data["supplier_history"] }

    if "purchase_link_history" in data:
      data["purchase_link_history"] = { now_formatted : data["purchase_link_history"] }

    data_arr.append(data)


# go through data_arr and find the latest supplier, price, inventory, backstock, and purchase_link
for part in data_arr:
  latest_supplier = ""
    # sort supplier_history by date
  if "supplier_history" in part:
    supplier_history = part["supplier_history"]
    sorted_supplier_history = sorted(supplier_history.items(), key=lambda x: datetime.datetime.strptime(x[0], "%Y-%m-%d %H:%M:%S"), reverse=True)
    latest_supplier = sorted_supplier_history[0][1]
  part["current_supplier"] = latest_supplier
  

  latest_price = -1
  # sort price_history by date
  if "price_history" in part:
    # also strip all the price history values of the $
    price_history = part["price_history"]
    sorted_price_history = sorted(price_history.items(), key=lambda x: datetime.datetime.strptime(x[0], "%Y-%m-%d %H:%M:%S"), reverse=True)
    latest_price = sorted_price_history[0][1]
  part["current_price"] = latest_price
  
  latest_purchase_link = ""
  # sort purchase_link_history by date
  if "purchase_link_history" in part:
    purchase_link_history = part["purchase_link_history"]
    sorted_purchase_link_history = sorted(purchase_link_history.items(), key=lambda x: datetime.datetime.strptime(x[0], "%Y-%m-%d %H:%M:%S"), reverse=True)
    latest_purchase_link = sorted_purchase_link_history[0][1]
  part["current_purchase_link"] = latest_purchase_link

  latest_inventory = -1
  # sort inventory_history by date
  if "inventory_history" in part:
    inventory_history = part["inventory_history"]
    sorted_inventory_history = sorted(inventory_history.items(), key=lambda x: datetime.datetime.strptime(x[0], "%Y-%m-%d %H:%M:%S"), reverse=True)
    latest_inventory = sorted_inventory_history[0][1]
  part["current_inventory"] = latest_inventory
  
  latest_backstock = -1
  # sort backstock_history by date
  if "backstock_history" in part:
    backstock_history = part["backstock_history"]
    sorted_backstock_history = sorted(backstock_history.items(), key=lambda x: datetime.datetime.strptime(x[0], "%Y-%m-%d %H:%M:%S"), reverse=True)
    latest_backstock = sorted_backstock_history[0][1]
  part["current_backstock"] = latest_backstock


json_dump = json.dumps(data_arr, indent=4)
with open('output.json', 'w') as outputFile:
  outputFile.write(json_dump)  

with open('log.txt', 'w') as outputFile:
  outputFile.write(log_message)