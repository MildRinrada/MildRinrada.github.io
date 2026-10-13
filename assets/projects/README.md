# Project images

Every project has its own folder, already filled with template images:

```
assets/projects/
  kawaiibake/        01.png  02.png  03.png
  customer-service/  01.png  02.png  03.png
  fictionthai/       01.png  02.png  03.png
  securesight/       01.png  02.png  03.png
  happy-paws-clinic/ 01.png  02.png  03.png
  mewbark-ai/        01.png  02.png  03.png
  nk-digital-library/        01.png  02.png  03.png
  thai-breastfeeding-center/ 01.png  02.png  03.png
  thai-emotion-detection/    01.png  02.png  03.png  04.png
  laptop-recommendation/     01.png  02.png  03.png
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

## Before you publish

- Work projects: only use screenshots your company has approved. Blur or replace real client data.
- Large PNG screenshots are slow on phones. Optional: convert to WebP at squoosh.app and update the file names.
