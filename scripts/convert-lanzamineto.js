import sharp from 'sharp'
import { join } from 'path'

const dir = join(process.cwd(), 'static', 'club')
const input = join(dir, 'lanzamineto.jpg')
const output = join(dir, 'lanzamineto-converted.jpg')

async function convert() {
  try {
    await sharp(input)
      .toColorspace('srgb')
      .jpeg({ quality: 90 })
      .toFile(output)

    console.log('Converted:', output)
  }
  catch (err) {
    console.error('Error converting image:', err)
    process.exit(1)
  }
}

convert()
