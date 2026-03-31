from PIL import Image, ImageDraw
import os

sizes = [256, 128, 64, 48, 32, 16]
base_size = 256
img = Image.new('RGBA', (base_size, base_size), (18, 24, 38, 255))
draw = ImageDraw.Draw(img)

for radius, alpha in [(140, 15), (150, 25), (160, 45), (170, 65), (180, 90)]:
    bbox = [base_size / 2 - radius, base_size / 2 - radius, base_size / 2 + radius, base_size / 2 + radius]
    draw.ellipse(bbox, fill=(31, 97, 255, alpha))

folder_body = [(44, 96), (212, 96), (212, 178), (44, 178)]
draw.rounded_rectangle(folder_body, radius=18, fill=(28, 47, 88, 255))

draw.polygon([(44, 96), (100, 60), (180, 60), (212, 96)], fill=(55, 120, 255, 255))

draw.rectangle([(56, 102), (208, 170)], fill=(37, 60, 110, 255))
draw.rectangle([(56, 102), (208, 122)], fill=(55, 120, 255, 255))

line_y = 124
lines = [(72, 184), (72, 184), (72, 184), (72, 160), (72, 152)]
for x1, x2 in lines:
    draw.line((x1, line_y, x2, line_y), fill=(182, 225, 255, 255), width=8)
    line_y += 20

draw.line((90, line_y, 110, line_y), fill=(182, 225, 255, 255), width=8)
line_y += 20

draw.line((128, line_y, 164, line_y), fill=(182, 225, 255, 255), width=8)

draw.rounded_rectangle(folder_body, radius=18, outline=(96, 165, 255, 255), width=4)
draw.line((56, 102, 208, 102), fill=(127, 185, 255, 255), width=3)

os.makedirs('src-tauri/icons', exist_ok=True)
img.save('src-tauri/icons/icon.ico', format='ICO', sizes=[(s, s) for s in sizes])
print('wrote src-tauri/icons/icon.ico')
