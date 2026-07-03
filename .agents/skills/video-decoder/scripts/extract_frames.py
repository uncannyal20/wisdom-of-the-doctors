import os
import sys
import imageio

if len(sys.argv) < 2:
    print("Error: Please provide video file path.")
    sys.exit(1)

video_path = sys.argv[1]
if not os.path.exists(video_path):
    print(f"Error: File not found: {video_path}")
    sys.exit(1)

# Ensure output directory exists
workspace_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
output_dir = os.path.join(workspace_dir, 'scratch', 'video_inspection')
os.makedirs(output_dir, exist_ok=True)

print(f"Loading video: {video_path}")
reader = imageio.get_reader(video_path)
meta = reader.get_meta_data()
fps = meta.get('fps', 30)
n_frames = meta.get('nframes', 0)
duration = meta.get('duration', 0)

print(f"Video Info -> FPS: {fps}, Total Frames: {n_frames}, Duration: {duration} seconds")

# Extract up to 6 frames evenly spaced
if n_frames > 0:
    step = max(1, n_frames // 6)
else:
    step = int(fps * max(1, duration // 6))

frames_extracted = 0
for i, frame in enumerate(reader):
    if i % step == 0 and frames_extracted < 6:
        out_path = os.path.join(output_dir, f"frame_{frames_extracted}.png")
        imageio.imwrite(out_path, frame)
        print(f"Saved frame {frames_extracted} (index {i}) to {out_path}")
        frames_extracted += 1
    if frames_extracted >= 6:
        break

reader.close()
print(f"Finished extracting frames! Outputs stored in: {output_dir}")
