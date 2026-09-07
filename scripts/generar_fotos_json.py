import os
import json
import re
from urllib.parse import quote

fotos_dir = r"c:\LNCZ\otra\assets\fotos"
output_json = r"c:\LNCZ\otra\data\fotos.json"

meses = {
    "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
    "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
    "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
}

fotos = []

# List all image files
files = sorted([f for f in os.listdir(fotos_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])

frases = [
    ("Un recuerdo inolvidable", "Momentos que se quedan grabados para siempre."),
    ("Nuestra complicidad", "Esa sonrisa que ilumina cualquier día."),
    ("Tú y yo", "El mejor lugar del mundo es a tu lado."),
    ("Instantes mágicos", "Cada segundo compartido vale una eternidad."),
    ("Juntos siempre", "Haciendo de cada día una aventura especial."),
    ("Detalles que enamoran", "Una mirada dice más que mil palabras."),
    ("Nuestros momentos", "Donde el tiempo se detiene cuando estamos juntos."),
    ("Risas y miradas", "La alegría de compartir la vida contigo."),
    ("Puro amor", "Todo es más bonito desde que estás aquí."),
    ("Recuerdos del corazón", "De esos días que jamás quiero olvidar.")
]

for idx, filename in enumerate(files):
    # Parse date if possible
    fecha = "Un día especial"
    
    # Check for YYYYMMDD
    match = re.search(r'(202[4-6])([0-1][0-9])([0-3][0-9])', filename)
    if match:
        ano, mes, dia = match.group(1), match.group(2), match.group(3)
        nombre_mes = meses.get(mes, "Especial")
        fecha = f"{int(dia)} de {nombre_mes}, {ano}"
    
    frase_idx = idx % len(frases)
    titulo_base, desc_base = frases[frase_idx]
    
    if "Screenshot" in filename or "WA" in filename:
        titulo = f"Mensajes & Recuerdos"
        desc = "Esas conversaciones que guardo con cariño en el corazón."
    else:
        titulo = titulo_base
        desc = desc_base

    # URL path (relative)
    # Use encode for spaces and special characters
    safe_name = quote(filename)
    url = f"assets/fotos/{safe_name}"

    fotos.append({
        "id": f"foto-{idx+1}",
        "url": url,
        "titulo": titulo,
        "fecha": fecha,
        "descripcion": desc
    })

with open(output_json, "w", encoding="utf-8") as f:
    json.dump(fotos, f, ensure_ascii=False, indent=2)

print(f"Total fotos procesadas: {len(fotos)}")
