import csv

input_file = '/Users/kevintong/Documents/Code/bikenode.com/data/transformed/Motorcycle_Transformed_Data copy.csv'
output_file = '/Users/kevintong/Documents/Code/bikenode.com/data/transformed/Motorcycle_Transformed_Data_updated.csv'

with open(input_file, newline='', encoding='utf-8') as fin, open(output_file, 'w', newline='', encoding='utf-8') as fout:
    reader = csv.reader(fin)
    writer = csv.writer(fout)
    
    for i, row in enumerate(reader):
        if i == 0:
            # Updated header: insert an extra field as column 4
            new_header = [row[0], row[1], row[2], 'Package', row[3], row[4], row[5]]
            writer.writerow(new_header)
        else:
            # For each data row, insert an empty field in column 4.
            # Assuming the original row has 6 columns.
            new_row = [row[0], row[1], row[2], '', row[3], row[4], row[5]]
            writer.writerow(new_row)
