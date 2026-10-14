# Project images and videos

Every project has its own folder, already filled with templates:

```
assets/projects/
  kawaiibake/        01.png  02.png  03.png  04.png
  customer-service/  demo.mp4  01.png  02.png  03.png  04.png   ← demo.mp4 plays first
  fictionthai/       01.png  02.png  03.png  04.png
  securesight/       01.png  02.png  03.png
  happy-paws-clinic/ 01.png  02.png  03.png
  mewbark-ai/        01.png  02.png  03.png
  nk-digital-library/        01.png  02.png  03.png
  thai-breastfeeding-center/ 01.png  02.png  03.png
  thai-emotion-detection/    01.png  02.png  03.png
  laptop-recommendation/     01.png  02.png  03.png
  kpop-mart/                 01.png  02.png  03.png  04.png  05.png
  mildtutor/                 01.png  02.png  03.png  04.png
assets/profile/
  photo.png          ← your photo (square, about 800 × 800)
```

## Replacing a template

1. Take the screenshot (16:10 looks best, e.g. 1600 × 1000).
2. Save it over the template with the **same file name**, e.g. `kawaiibake/01.png`.
3. Refresh. `01.png` is always the cover.

## More (or fewer) images

- Add `04.png`, `05.png`… to the folder, then add a matching line under that place's `media.images` in `data/town.js`.
- To use fewer, delete the extra lines in `media.images` (and the files).
- `.jpg` and `.webp` work too. Just make the file name in `data/town.js` match.

## Demo videos

`customer-service/demo.mp4` holds the demo video and plays first in the gallery. To swap it, save the new video over it with the **same name**. The four pictures stay where they are, and `01.png` is still the cover in the list view and on the CV.

- Format: **MP4 (H.264)** plays in every browser. 16:10 or 16:9; 1080p is plenty.
- Size: keep it under about **20 MB** so it starts quickly (GitHub refuses files over 100 MB). HandBrake's "Fast 1080p30" preset, or any online MP4 compressor, gets it there.
- To add a video to another project, put the file in its folder and add `{ src: 'assets/projects/<id>/demo.mp4', type: 'video' }` to that place's `media.images` in `data/town.js`.

## Before you publish

- Work projects: only use screenshots your company has approved. Blur or replace real client data.
- Large PNG screenshots are slow on phones. Optional: convert to WebP at squoosh.app and update the file names.
