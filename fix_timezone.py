import os
import re

directory = r'c:\Users\Waskar\Desktop\AmericableS\client\src'
count = 0
for root, _, files in os.walk(directory):
    for filename in files:
        if filename.endswith(('.jsx', '.js', '.ts', '.tsx')):
            filepath = os.path.join(root, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            orig_content = content
            
            # 1. toLocaleString containing just 'es-NI' or empty
            content = re.sub(
                r"\.toLocaleString\(\s*(['\"]es-NI['\"]|\s*)\s*\)",
                r".toLocaleString('es-NI', { timeZone: 'America/Managua', hour12: true })",
                content
            )

            # 2. toLocaleDateString containing just 'es-NI' or empty
            content = re.sub(
                r"\.toLocaleDateString\(\s*(['\"]es-NI['\"]|\s*)\s*\)",
                r".toLocaleDateString('es-NI', { timeZone: 'America/Managua' })",
                content
            )

            # 3. toLocaleTimeString with existing options array like ([], { ... })
            content = re.sub(
                r"\.toLocaleTimeString\(\s*\[\s*\]\s*,\s*\{\s*([^\}]+)\s*\}\s*\)",
                r".toLocaleTimeString('es-NI', { timeZone: 'America/Managua', hour12: true, \1 })",
                content
            )

            # 4. toLocaleTimeString containing just 'es-NI' or empty
            content = re.sub(
                r"\.toLocaleTimeString\(\s*(['\"]es-NI['\"]|\s*)\s*\)",
                r".toLocaleTimeString('es-NI', { timeZone: 'America/Managua', hour12: true })",
                content
            )

            if orig_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated {filename}")
                count += 1

print(f"Total updated: {count}")
