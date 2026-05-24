import os

# Target URL: https://7k2k6kcj-8000.inc1.devtunnels.ms
target_url = 'https://7k2k6kcj-8000.inc1.devtunnels.ms'
source_url = 'http://localhost:8000'

root_dir = 'cognihaven-frontend/src'
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content.replace(source_url, target_url)
            
            if content != new_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated backend URL in {path}")

# Also update vite.config.ts
vite_config = 'cognihaven-frontend/vite.config.ts'
if os.path.exists(vite_config):
    with open(vite_config, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = content.replace(source_url, target_url)
    if content != new_content:
        with open(vite_config, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated backend URL in {vite_config}")
