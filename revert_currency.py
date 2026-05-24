import os

# Reverting currency to $ to see if it fixes the blank page issue.
# This helps rule out encoding/character issues.

root_dir = 'cognihaven-frontend/src'
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content.replace('₹', '$')
            
            if content != new_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Reverted currency to $ in {path}")
