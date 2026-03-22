import sys
try:
    from PIL import Image
    import os
    
    input_path = "App icon.png"
    icon_path = "cosmos-parent/assets/icon.png"
    adaptive_icon_path = "cosmos-parent/assets/adaptive-icon.png"
    
    img = Image.open(input_path).convert("RGBA")
    
    # Create white background
    white_bg = Image.new("RGBA", img.size, "WHITE")
    white_bg.paste(img, (0, 0), img)
    
    # Save as icon.png
    white_bg.save(icon_path, "PNG")
    
    # Save as adaptive-icon.png
    white_bg.save(adaptive_icon_path, "PNG")
    
    print("Icons processed successfully.")
except ImportError:
    print("Pillow not installed")
