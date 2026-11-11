const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const here = __dirname;

(async () => {
  const chatgpt = fs.readFileSync(path.join(here, 'chatgpt.svg'));
  await sharp(chatgpt).resize(720, 720).png().toFile(path.join(here, 'chatgpt-720.png'));
  const openSlide = fs.readFileSync(path.join(here, 'open-slide.svg'));
  await sharp(openSlide).png().toFile(path.join(here, 'open-slide-512.png'));
  console.log('wrote chatgpt-720.png and open-slide-512.png');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
