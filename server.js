import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 5174

// Serve static files from the project `static/` directory at the web root
app.use(express.static(path.join(__dirname, 'static')))

// Health endpoint
app.get('/health', (req, res) => {
  res.type('text').send('ok')
})

app.listen(port, () => {
  console.log(`Static server listening on http://localhost:${port}`)
  console.log('Health: http://localhost:' + port + '/health')
})
