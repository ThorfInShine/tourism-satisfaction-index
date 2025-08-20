import json
import os
from functools import lru_cache
import re

# Default data kunjungan wisata - UPDATED dengan data terbaru
DEFAULT_KUNJUNGAN_WISATA = {
    'Alun-Alun Kota Wisata Batu': 2302385,
    'Jatim Park I': 752484,
    'Jatim Park II': 737738,
    'Jatim Park III': 523479,
    'Taman Rekreasi Selecta': 487582,
    'Wana Wisata Coban Talun': 467021,
    'Museum Angkut +': 462954,
    'BNS (Batu Night Spectacular)': 371991,
    'Jalur Pendakian Gunung Panderman': 256770,
    'Eco Green Park': 221142,
    'Pemandian Air Panas Alam Cangar': 169249,
    'Millenial Glow Garden': 163359,
    'Batu Love Garden': 133973,
    'Desa Wisata Sidomulyo': 115909,
    'Predator Fun Park/Batu Economis Park': 111315,
    'Wana Wisata Coba Rais': 88754,
    'Gunung Banyak': 70651,
    'Wana Wisata Coban Putri': 53995,
    'Desa Wisata Tulungrejo': 53521,
    'Songgoriti Hot Spring + Pemandian Tirta Nirwana Songgoriti': 50797,
    'Desa Wisata Pandanrejo (Lumbung Stroberi)': 20470,
    'Desa Wisata Punten': 19286,
    'Petik Apel Mandiri': 17764,
    'Taman Pinus Campervan Park': 17621,
    'Jalur Pendakian Gunung Arjuno': 13671,
    'Taman Dolan': 10325,
    'Wonderland Waterpark': 9559,
    'Desa Wisata Bumiaji': 5054,
    'Batu Rafting': 3253,
    'Goa Pinus': 3064
}

# Mapping alternatif nama untuk mencocokkan dengan dataset review
NAMA_ALTERNATIF = {
    # Mapping nama dataset review -> nama data kunjungan
    'eco green park': 'Eco Green Park',
    'eco active park': 'Eco Green Park',  # Sama dengan Eco Green Park
    'museum angkut': 'Museum Angkut +',
    'museum angkut +': 'Museum Angkut +',
    'jatim park 1': 'Jatim Park I',
    'jatim park i': 'Jatim Park I',
    'jatim park 2': 'Jatim Park II',
    'jatim park ii': 'Jatim Park II',
    'jatim park 3': 'Jatim Park III',
    'jatim park iii': 'Jatim Park III',
    'batu night spectacular': 'BNS (Batu Night Spectacular)',
    'bns': 'BNS (Batu Night Spectacular)',
    'taman selecta': 'Taman Rekreasi Selecta',
    'selecta': 'Taman Rekreasi Selecta',
    'coban talun': 'Wana Wisata Coban Talun',
    'gunung panderman': 'Jalur Pendakian Gunung Panderman',
    'alun alun kota wisata batu': 'Alun-Alun Kota Wisata Batu',
    'alun-alun kota wisata batu': 'Alun-Alun Kota Wisata Batu',
    'coban rais': 'Wana Wisata Coba Rais',
    'air terjun coban rais': 'Wana Wisata Coba Rais',
    'coban putri': 'Wana Wisata Coban Putri',
    'songgoriti hot springs': 'Songgoriti Hot Spring + Pemandian Tirta Nirwana Songgoriti',
    'tirta nirwana hotspring': 'Songgoriti Hot Spring + Pemandian Tirta Nirwana Songgoriti',
    'pemandian air panas cangar': 'Pemandian Air Panas Alam Cangar',
    'cangar': 'Pemandian Air Panas Alam Cangar',
    'milenial glow garden': 'Millenial Glow Garden',
    'millenial glow garden': 'Millenial Glow Garden',
    'batu economis park': 'Predator Fun Park/Batu Economis Park',
    'predator fun park': 'Predator Fun Park/Batu Economis Park',
    'desa wisata tulungrejo': 'Desa Wisata Tulungrejo',
    'wisata bunga sidomulyo': 'Desa Wisata Sidomulyo',
    'desa wisata sidomulyo': 'Desa Wisata Sidomulyo',
    'paralayang gunung banyak': 'Gunung Banyak',
    'gunung arjuno': 'Jalur Pendakian Gunung Arjuno',
    'wisata petik apel mandiri': 'Petik Apel Mandiri',
    'petik apel': 'Petik Apel Mandiri',
    'taman pinus campervan': 'Taman Pinus Campervan Park',
    'desa wisata punten': 'Desa Wisata Punten',
    'lumbung stroberi': 'Desa Wisata Pandanrejo (Lumbung Stroberi)',
    'desa wisata agro bumiaji': 'Desa Wisata Bumiaji',
    'wisata desa agro bumiaji': 'Desa Wisata Bumiaji',
    'gussari goa pinus batu': 'Goa Pinus',
    'goa pinus': 'Goa Pinus'
}

def normalize_wisata_name(nama):
    """Normalize wisata name for better matching"""
    if not nama:
        return ""
    
    nama_clean = str(nama).strip()
    nama_lower = nama_clean.lower()
    
    # Remove common prefixes/suffixes
    prefixes_to_remove = ['wisata ', 'tempat wisata ', 'objek wisata ', 'wana wisata ']
    suffixes_to_remove = [' batu', ' kota batu', ' malang']
    
    for prefix in prefixes_to_remove:
        if nama_lower.startswith(prefix):
            nama_lower = nama_lower[len(prefix):]
            break
    
    for suffix in suffixes_to_remove:
        if nama_lower.endswith(suffix):
            nama_lower = nama_lower[:-len(suffix)]
            break
    
    # Clean up extra spaces and characters
    nama_lower = re.sub(r'[^\w\s]', ' ', nama_lower)
    nama_lower = ' '.join(nama_lower.split())
    
    return nama_lower

def get_kunjungan_data():
    """Load kunjungan data from JSON file or return default"""
    try:
        # Import Flask app context
        from flask import current_app
        
        if current_app:
            kunjungan_file = os.path.join(current_app.config['UPLOAD_FOLDER'], 'kunjungan_data.json')
            
            if os.path.exists(kunjungan_file):
                with open(kunjungan_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # Create default file
                os.makedirs(os.path.dirname(kunjungan_file), exist_ok=True)
                with open(kunjungan_file, 'w', encoding='utf-8') as f:
                    json.dump(DEFAULT_KUNJUNGAN_WISATA, f, ensure_ascii=False, indent=2)
                return DEFAULT_KUNJUNGAN_WISATA.copy()
        else:
            # Fallback when no app context
            return DEFAULT_KUNJUNGAN_WISATA.copy()
            
    except Exception as e:
        print(f"Error loading kunjungan data: {e}")
        return DEFAULT_KUNJUNGAN_WISATA.copy()

def get_wisata_kunjungan(nama_wisata):
    """Get kunjungan count for specific wisata with improved fuzzy matching - NO FALLBACK TO REVIEW COUNT"""
    if not nama_wisata or str(nama_wisata).strip() == '':
        return 0
    
    kunjungan_data = get_kunjungan_data()
    nama_input = str(nama_wisata).strip()
    nama_lower = nama_input.lower()
    
    # Step 1: Exact match
    for wisata_name, count in kunjungan_data.items():
        if nama_lower == wisata_name.lower():
            return count
    
    # Step 2: Check mapping alternatif
    if nama_lower in NAMA_ALTERNATIF:
        mapped_name = NAMA_ALTERNATIF[nama_lower]
        if mapped_name in kunjungan_data:
            return kunjungan_data[mapped_name]
    
    # Step 3: Normalize and check mapping
    nama_normalized = normalize_wisata_name(nama_input)
    if nama_normalized in NAMA_ALTERNATIF:
        mapped_name = NAMA_ALTERNATIF[nama_normalized]
        if mapped_name in kunjungan_data:
            return kunjungan_data[mapped_name]
    
    # Step 4: Fuzzy matching dengan normalisasi
    for wisata_name, count in kunjungan_data.items():
        wisata_normalized = normalize_wisata_name(wisata_name)
        
        # Check if normalized names match
        if nama_normalized == wisata_normalized:
            return count
        
        # Check if one contains the other (after normalization)
        if nama_normalized in wisata_normalized or wisata_normalized in nama_normalized:
            # Additional check: ensure it's a meaningful match (not too short)
            if len(nama_normalized) >= 3 and len(wisata_normalized) >= 3:
                return count
    
    # Step 5: Keyword matching untuk kasus khusus
    keywords_mapping = {
        'eco green': 'Eco Green Park',
        'museum angkut': 'Museum Angkut +',
        'jatim park': ['Jatim Park I', 'Jatim Park II', 'Jatim Park III'],  # Ambil yang pertama
        'selecta': 'Taman Rekreasi Selecta',
        'coban talun': 'Wana Wisata Coban Talun',
        'panderman': 'Jalur Pendakian Gunung Panderman',
        'alun alun': 'Alun-Alun Kota Wisata Batu',
        'bns': 'BNS (Batu Night Spectacular)',
        'night spectacular': 'BNS (Batu Night Spectacular)',
        'cangar': 'Pemandian Air Panas Alam Cangar',
        'glow garden': 'Millenial Glow Garden',
        'love garden': 'Batu Love Garden'
    }
    
    for keyword, target in keywords_mapping.items():
        if keyword in nama_lower:
            if isinstance(target, list):
                target = target[0]  # Ambil yang pertama
            if target in kunjungan_data:
                return kunjungan_data[target]
    
    # Step 6: Return 0 if no match found (JANGAN gunakan review count sebagai fallback)
    print(f"Warning: No kunjungan data found for '{nama_wisata}' - returning 0")
    return 0

def clear_cache():
    """Clear cache for kunjungan data"""
    if hasattr(get_kunjungan_data, 'cache_clear'):
        get_kunjungan_data.cache_clear()