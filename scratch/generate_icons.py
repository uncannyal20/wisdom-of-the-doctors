import os
from PIL import Image, ImageDraw

def create_icon(size):
    # Create the base image (512x512 canvas for high quality drawing)
    img = Image.new('RGBA', (512, 512), '#1A1108')
    draw = ImageDraw.Draw(img)
    
    # Outer circle
    draw.ellipse([256 - 240, 256 - 240, 256 + 240, 256 + 240], outline='#C9A84C', width=8)
    
    # Draw one vertical ellipse on a separate transparent layer
    petals = Image.new('RGBA', (512, 512), (0,0,0,0))
    petal_draw = ImageDraw.Draw(petals)
    # Color #C9A84C with opacity 0.6 is (201, 168, 76, 153)
    petal_draw.ellipse([256 - 30, 256 - 128 - 72, 256 + 30, 256 - 128 + 72], fill=(201, 168, 76, 153))
    
    # Rotate and composite 8 times
    for angle in range(0, 360, 45):
        # Rotate around the center (256, 256)
        rotated_petal = petals.rotate(angle, resample=Image.Resampling.BICUBIC)
        img = Image.alpha_composite(img, rotated_petal)
        
    # Re-draw context for remaining shapes
    draw = ImageDraw.Draw(img)
    
    # Inner filled circle (opacity 0.9 = 229)
    draw.ellipse([256 - 48, 256 - 48, 256 + 48, 256 + 48], fill=(201, 168, 76, 229))
    
    # Intermediate circle (opacity 0.4 = 102)
    draw.ellipse([256 - 112, 256 - 112, 256 + 112, 256 + 112], outline=(201, 168, 76, 102), width=6)
    
    # Convert to RGB (opaque background)
    final_img = img.convert('RGB')
    
    # Resize to target size using high-quality Lanzcos filter
    return final_img.resize((size, size), Image.Resampling.LANCZOS)

# Create icons directory inside the workspace
workspace_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
icons_dir = os.path.join(workspace_dir, 'icons')
os.makedirs(icons_dir, exist_ok=True)

# Generate and save
icon_192 = create_icon(192)
icon_192.save(os.path.join(icons_dir, 'icon-192.png'), 'PNG')

icon_512 = create_icon(512)
icon_512.save(os.path.join(icons_dir, 'icon-512.png'), 'PNG')

print("Icons generated successfully in workspace/icons!")
