"""
fix_timezone.py — Corrige zona horaria America/Managua en todo el frontend
Ejecutar desde la raíz del proyecto:  python fix_timezone.py
"""
import os
import re

# Helper para inyectar timeZone si falta en opciones existentes
def add_tz_if_missing(m):
    full = m.group(0)
    if 'timeZone' in full or 'America/Managua' in full:
        return full
    method    = m.group(1)
    locale    = m.group(2)
    opts_in   = m.group(3)
    return f".{method}({locale}, {{ timeZone: 'America/Managua', {opts_in} }})"

directory = r'c:\Users\Waskar\Desktop\AmericableS\client\src'
count = 0

for root, _, files in os.walk(directory):
    for filename in files:
        if not filename.endswith(('.jsx', '.js', '.ts', '.tsx')):
            continue

        filepath = os.path.join(root, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        orig_content = content

        # 1. toLocaleString('es-NI') sin opciones
        content = re.sub(
            r"\.toLocaleString\(\s*'es-NI'\s*\)",
            ".toLocaleString('es-NI', { timeZone: 'America/Managua', hour12: true })",
            content
        )
        # 2. toLocaleString() sin argumentos
        content = re.sub(
            r"\.toLocaleString\(\s*\)",
            ".toLocaleString('es-NI', { timeZone: 'America/Managua', hour12: true })",
            content
        )

        # 3. toLocaleDateString('es-NI') sin opciones
        content = re.sub(
            r"\.toLocaleDateString\(\s*'es-NI'\s*\)",
            ".toLocaleDateString('es-NI', { timeZone: 'America/Managua' })",
            content
        )
        # 4. toLocaleDateString() sin argumentos
        content = re.sub(
            r"\.toLocaleDateString\(\s*\)",
            ".toLocaleDateString('es-NI', { timeZone: 'America/Managua' })",
            content
        )

        # 5. toLocaleTimeString('es-NI') sin opciones
        content = re.sub(
            r"\.toLocaleTimeString\(\s*'es-NI'\s*\)",
            ".toLocaleTimeString('es-NI', { timeZone: 'America/Managua', hour12: true })",
            content
        )
        # 6. toLocaleTimeString() sin argumentos
        content = re.sub(
            r"\.toLocaleTimeString\(\s*\)",
            ".toLocaleTimeString('es-NI', { timeZone: 'America/Managua', hour12: true })",
            content
        )

        # 7. toLoacleString/Date/Time con opciones pero SIN timeZone
        content = re.sub(
            r"\.(toLocaleString|toLocaleDateString|toLocaleTimeString)\(('es-NI'),\s*\{([^}]+?)\}\s*\)",
            add_tz_if_missing,
            content
        )

        if orig_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✅ Actualizado: {filename}")
            count += 1

print(f"\n{'─'*50}")
print(f"Total archivos actualizados: {count}")
print(f"{'─'*50}")
