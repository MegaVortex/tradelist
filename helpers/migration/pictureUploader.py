import os
import csv
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = ['https://www.googleapis.com/auth/drive.file']

def authenticate():
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES)
    creds = flow.run_local_server(port=0)
    return build('drive', 'v3', credentials=creds)

def upload_images(service, root_folder_id, image_folder, csv_file='drive_image_map.csv'):
    folder_cache = {}

    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['filename', 'file_id', 'download_url', 'view_url'])

    def get_or_create_drive_folder(drive_service, local_path):
        if local_path in folder_cache:
            return folder_cache[local_path]

        parts = local_path.strip(os.sep).split(os.sep)
        parent_id = root_folder_id
        path_so_far = ''

        for part in parts:
            path_so_far = os.path.join(path_so_far, part)
            if path_so_far in folder_cache:
                parent_id = folder_cache[path_so_far]
                continue

            folder_metadata = {
                'name': part,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [parent_id]
            }
            folder = drive_service.files().create(
                body=folder_metadata,
                fields='id'
            ).execute()
            parent_id = folder['id']
            folder_cache[path_so_far] = parent_id

        return parent_id

    print(f"Scanning: {image_folder}")
    for root, _, files in os.walk(image_folder):
        rel_folder = os.path.relpath(root, image_folder)
        drive_folder_id = get_or_create_drive_folder(service, rel_folder) if rel_folder != '.' else root_folder_id

        for filename in files:
            if not filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                continue
            try:
                file_path = os.path.join(root, filename)
                print(f"Uploading: {file_path}")
                file_metadata = {
                    'name': filename,
                    'parents': [drive_folder_id]
                }
                media = MediaFileUpload(file_path, resumable=False)
                uploaded = service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id'
                ).execute()

                file_id = uploaded.get('id')
                service.permissions().create(
                fileId=file_id,
                body={
                    'role': 'reader',
                    'type': 'anyone'
                }
                ).execute()
                if file_id:
                    relative_path = os.path.relpath(file_path, image_folder).replace('\\', '/')
                    download_url = f'https://drive.google.com/uc?id={file_id}'
                    view_url = f'https://drive.google.com/file/d/{file_id}/view'

                    with open(csv_file, 'a', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        writer.writerow([relative_path, file_id, download_url, view_url])

                    print(f"✅ Uploaded: {relative_path} → {file_id}")
                else:
                    print(f"❌ No file ID returned for: {filename}")

            except Exception as e:
                print(f"❌ Failed to upload {file_path}: {e}")

def write_csv(mapping, output_file='drive_image_map.csv'):
    if not mapping:
        print("⚠️ No data to write to CSV.")
        return

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['filename', 'file_id', 'download_url', 'view_url'])
        writer.writerows(mapping)

    print(f"✅ Wrote {len(mapping)} entries to {output_file}")

def main():
    service = authenticate()
    folder_id = '1R5uHXNl-rvg6JtzerPSFeFy8HRxVlM12'
    image_folder = r'C:\TradeList\tradelist.ucoz.ru\_si'
    mapping = upload_images(service, folder_id, image_folder)
    print(f"🔎 Total images uploaded: {len(mapping)}")
    write_csv(mapping)

if __name__ == '__main__':
    main()