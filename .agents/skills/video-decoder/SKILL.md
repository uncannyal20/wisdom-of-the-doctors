---
name: video-decoder
description: Decodes and inspects QuickTime .mov and other unsupported video files by extracting frames.
---

# Video Decoder Skill

This skill allows the agent to inspect and "watch" video files (such as QuickTime `.mov` files) that are otherwise flagged as `application/octet-stream` by standard file viewers. 

## How to use this skill:

1. **Locate the Video:** Find the absolute path to the video file in the workspace.
2. **Run the Extractor Script:** Run the python extraction script located at `.agents/skills/video-decoder/scripts/extract_frames.py` passing the video file as an argument.
   ```bash
   python3 .agents/skills/video-decoder/scripts/extract_frames.py "/path/to/video.mov"
   ```
3. **Inspect the Frames:** The script will extract 6 key frames evenly spaced across the video duration and save them as PNG files in the `<workspace_root>/scratch/video_inspection/` directory.
4. **View Frames:** Use `view_file` to open the generated PNG frames (e.g., `frame_0.png`, `frame_1.png`, etc.) to visually inspect the video content and diagnose layout or rendering issues.
