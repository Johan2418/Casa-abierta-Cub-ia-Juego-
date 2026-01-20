# Generación de Texturas para Career Area

Este directorio contiene las texturas de texto que se muestran en los bloques de la carrera.

## Texturas del Club de IA

Las siguientes texturas necesitan ser creadas para el Club de IA:

1. `careerAIClub.ktx` - "Club de IA"
2. `careerMachineLearning.ktx` - "Machine Learning"
3. `careerTechCommunity.ktx` - "Comunidad Tech"
4. `careerReinforcementLearning.ktx` - "Aprendizaje por Refuerzo"
5. `careerDataScience.ktx` - "Ciencia de Datos"
6. `careerComputerVision.ktx` - "Visión Computacional"

## Método 1: Usar el script de generación

1. Asegúrate de tener Node.js instalado
2. Instala canvas: `npm install canvas`
3. Ejecuta el script: `node scripts/generate-career-textures.cjs`
4. Esto generará archivos PNG en `static/career/`
5. Convierte PNG a .ktx usando `toktx`:
   ```bash
   toktx --genmipmap --t2 static/career/careerAIClub.ktx static/career/careerAIClub.png
   toktx --genmipmap --t2 static/career/careerMachineLearning.ktx static/career/careerMachineLearning.png
   toktx --genmipmap --t2 static/career/careerTechCommunity.ktx static/career/careerTechCommunity.png
   toktx --genmipmap --t2 static/career/careerReinforcementLearning.ktx static/career/careerReinforcementLearning.png
   toktx --genmipmap --t2 static/career/careerDataScience.ktx static/career/careerDataScience.png
   toktx --genmipmap --t2 static/career/careerComputerVision.ktx static/career/careerComputerVision.png
   ```

## Método 2: Crear manualmente

1. Crea imágenes PNG con:
   - Fondo: Negro (#000000)
   - Texto: Blanco (#ffffff)
   - Fuente: Arial o similar, tamaño ~64px, negrita
   - Padding: ~20px alrededor del texto
   - Resolución: Ajustar según el tamaño del texto

2. Convierte PNG a .ktx usando `toktx` (Khronos KTX-Software):
   ```bash
   toktx --genmipmap --t2 output.ktx input.png
   ```

## Formato de las texturas

- **Formato**: KTX2 (.ktx)
- **Fondo**: Negro (#000000)
- **Texto**: Blanco (#ffffff)
- **Filtrado**: Linear (minFilter y magFilter)
- **Wrap**: ClampToEdge
- **FlipY**: false
- **Mipmaps**: false

## Instalación de toktx

`toktx` es parte de Khronos KTX-Software:
- Descarga desde: https://github.com/KhronosGroup/KTX-Software
- O instala desde tu gestor de paquetes:
  - Windows: Descarga el binario desde GitHub
  - Linux: `sudo apt-get install ktx-tools` (si está disponible)
  - macOS: `brew install ktx` (si está disponible)

## Notas

- Las texturas existentes (careerFreelancer, careerHetic, etc.) pueden servir como referencia
- El código en `CareerArea.js` ya está configurado para usar estas texturas
- Las texturas se mostrarán automáticamente cuando el jugador se acerque a cada línea

