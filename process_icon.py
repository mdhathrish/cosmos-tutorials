import sys
try:
    from PIL import Image, ImageOps
    import os
    
    input_path = "App icon.png"
    icon_path = "cosmos-parent/assets/icon.png"
    adaptive_icon_path = "cosmos-parent/assets/adaptive-icon.png"
    
    img = Image.open(input_path).convert("RGBA")
    
    # Trim transparent/empty space
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    
    # 1. Standard App Icon (e.g., iOS static)
    white_bg = Image.new("RGBA", (1024, 1024), "WHITE")
    img_standard = img.copy()
    img_standard.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    x = (1024 - img_standard.width) // 2
    y = (1024 - img_standard.height) // 2
    white_bg.paste(img_standard, (x, y), img_standard)
    white_bg.save(icon_path, "PNG")
    
    # 2. Android Adaptive Icon Foreground
    transparent_bg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    img_adaptive = img.copy()
    # Boost from 660 to 760 for larger presence in drawer while respecting most safe masks
    img_adaptive.thumbnail((760, 760), Image.Resampling.LANCZOS)
    ax = (1024 - img_adaptive.width) // 2
    ay = (1024 - img_adaptive.height) // 2
    transparent_bg.paste(img_adaptive, (ax, ay), img_adaptive)
    transparent_bg.save(adaptive_icon_path, "PNG")
    
    print("Icons processed successfully with Adaptive Safe Zones.")
except ImportError:
    print("Pillow not installed")
except Exception as e:
    print(f"Error: {e}")
