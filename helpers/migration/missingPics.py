import os
import csv

def get_local_images(root_folder):
    local_files = []
    for root, _, files in os.walk(root_folder):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                rel_path = os.path.relpath(os.path.join(root, file), root_folder).replace('\\', '/')
                local_files.append(rel_path)
    return set(local_files)

def get_uploaded_images_from_csv(csv_file):
    uploaded_files = set()
    with open(csv_file, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            uploaded_files.add(row['filename'])
    return uploaded_files

def find_missing_uploads(local_folder, csv_file, output_file='missing_uploads.txt'):
    local_images = get_local_images(local_folder)
    uploaded_images = get_uploaded_images_from_csv(csv_file)
    missing = sorted(local_images - uploaded_images)

    if missing:
        print(f"❌ Found {len(missing)} missing uploads.")
        with open(output_file, 'w', encoding='utf-8') as f:
            for path in missing:
                print(f" - {path}")
                f.write(path + '\n')
        print(f"📝 Missing file list saved to: {output_file}")
    else:
        print("✅ All images successfully uploaded!")

    return missing

if __name__ == '__main__':
    local_folder = r'C:\TradeList\tradelist.ucoz.ru\_si'
    csv_file = 'drive_image_map.csv'
    find_missing_uploads(local_folder, csv_file)