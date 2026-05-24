import os
import re

# We want to replace $ with ₹, but NOT if it's ${ (template literal)
# Regex: (?<!\{)\$(?!\{) -- this is a bit tricky for all cases.
# Safer: Just replace $ with ₹ if it's followed by a number or space, or if it's just a currency symbol in JSX.
# Or: Replace all $, then fix ${ back. (What I tried before, but let's do it in one go)

root_dir = 'cognihaven-frontend/src'
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Step 1: Replace all $ with ₹
            # BUT wait, the absolute URL revert might have put http://localhost:8000 back.
            # I should check what's in there.
            
            # Use a regex that replaces $ but not in ${
            # We look for $ and ensure it's not followed by {
            new_content = re.sub(r'\$(?!\{)', '₹', content)
            
            if content != new_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated currency symbols in {path}")

# Also update the backend logging strings
backend_path = 'cognihaven-backend/main.py'
if os.path.exists(backend_path):
    with open(backend_path, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = content.replace('$', '₹')
    if content != new_content:
        with open(backend_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated currency symbols in {backend_path}")
