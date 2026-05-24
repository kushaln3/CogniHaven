import os

# 1. Fix missing imports in LiveSOC.tsx
# 2. Ensure all URLs use the tunnel HTTPS address to avoid Mixed Content blocks.

target_url = 'https://7k2k6kcj-8000.inc1.devtunnels.ms'
source_url = 'http://localhost:8000'

root_dir = 'cognihaven-frontend/src'
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Fix backend URL
            new_content = content.replace(source_url, target_url)
            
            if content != new_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated backend URL in {path}")

# Fix missing Lucide icons in LiveSOC.tsx
soc_path = 'cognihaven-frontend/src/components/LiveSOC.tsx'
if os.path.exists(soc_path):
    with open(soc_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check for used but not imported icons
    icons_to_add = ['Zap', 'Target', 'TrendingUp', 'CheckCircle2', 'AlertTriangle']
    import_line = "import { ShieldAlert, Activity, Users, Terminal, Search, ChevronLeft, RefreshCw, UserPlus, Trash2, Info, X } from 'lucide-react';"
    new_import_line = "import { ShieldAlert, Activity, Users, Terminal, Search, ChevronLeft, RefreshCw, UserPlus, Trash2, Info, X, Zap, Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';"
    
    new_content = content.replace(import_line, new_import_line)
    
    if content != new_content:
        with open(soc_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed missing icons in {soc_path}")
