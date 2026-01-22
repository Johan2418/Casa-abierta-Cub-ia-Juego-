/**
 * Script para generar imágenes de texto para las texturas de intro en español
 * 
 * Uso:
 * 1. Asegúrate de tener Node.js instalado
 * 2. Instala canvas: npm install canvas --legacy-peer-deps
 * 3. Ejecuta: node scripts/generate-intro-textures.cjs
 * 
 * Esto generará archivos PNG en static/intro/
 * Luego necesitarás convertirlos a .ktx usando una herramienta como toktx
 */

// Nota: Este script usa CommonJS (require) aunque el proyecto use ES modules
// porque canvas funciona mejor con CommonJS
const fs = require('fs')
const path = require('path')

// Intentar importar canvas (puede requerir instalación)
let createCanvas, loadImage
try {
	const { createCanvas: _createCanvas, loadImage: _loadImage } = require('canvas')
	createCanvas = _createCanvas
	loadImage = _loadImage
} catch (error) {
	console.error('Error: canvas no está instalado.')
	console.error('Instala canvas ejecutando: npm install canvas')
	process.exit(1)
}

// Configuración
const outputDir = path.join(__dirname, '..', 'static', 'intro')
const fontSize = 64
const fontFamily = 'Arial'
const padding = 40
const backgroundColor = '#000000'
const textColor = '#ffffff'

// Textos a generar (en español)
const texts = [
	{ name: 'mouseKeyboardLabel', text: 'HAZ CLIC PARA COMENZAR' },
	{ name: 'gamepadXboxLabel', text: 'PRESIONA A PARA COMENZAR' },
	{ name: 'gamepadPlaystationLabel', text: 'PRESIONA X PARA COMENZAR' },
	{ name: 'touchLabel', text: 'TOCA PARA COMENZAR' },
]

// Asegurar que el directorio existe
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true })
}

// Función para generar una imagen de texto
function generateTexture(textConfig) {
	const canvas = createCanvas(1, 1)
	const ctx = canvas.getContext('2d')
	
	// Configurar fuente
	ctx.font = `bold ${fontSize}px "${fontFamily}"`
	
	// Medir texto
	const textMetrics = ctx.measureText(textConfig.text)
	const textWidth = textMetrics.width
	const textHeight = fontSize
	
	// Crear canvas con tamaño apropiado
	const width = Math.ceil(textWidth + padding * 2)
	const height = Math.ceil(textHeight + padding * 2)
	
	canvas.width = width
	canvas.height = height
	
	// Configurar contexto nuevamente (necesario después de cambiar tamaño)
	ctx.font = `bold ${fontSize}px "${fontFamily}"`
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	
	// Fondo negro
	ctx.fillStyle = backgroundColor
	ctx.fillRect(0, 0, width, height)
	
	// Texto blanco
	ctx.fillStyle = textColor
	ctx.fillText(textConfig.text, width / 2, height / 2)
	
	// Guardar como PNG
	const outputPath = path.join(outputDir, `${textConfig.name}.png`)
	const buffer = canvas.toBuffer('image/png')
	fs.writeFileSync(outputPath, buffer)
	
	console.log(`✓ Generado: ${textConfig.name}.png (${width}x${height})`)
	
	return outputPath
}

// Generar todas las texturas
console.log('Generando texturas de intro en español...\n')

texts.forEach(textConfig => {
	try {
		generateTexture(textConfig)
	} catch (error) {
		console.error(`✗ Error generando ${textConfig.name}:`, error.message)
	}
})

console.log('\n✓ Todas las imágenes PNG han sido generadas en:', outputDir)
console.log('\nPróximos pasos:')
console.log('1. Revisa las imágenes PNG generadas')
console.log('2. Convierte PNG a .ktx usando toktx (Khronos KTX-Software):')
console.log('   toktx --t2 static/intro/mouseKeyboardLabel.ktx static/intro/mouseKeyboardLabel.png')
console.log('   toktx --t2 static/intro/gamepadXboxLabel.ktx static/intro/gamepadXboxLabel.png')
console.log('   toktx --t2 static/intro/gamepadPlaystationLabel.ktx static/intro/gamepadPlaystationLabel.png')
console.log('   toktx --t2 static/intro/touchLabel.ktx static/intro/touchLabel.png')
console.log('3. Las texturas .ktx estarán listas para usar en el juego')

