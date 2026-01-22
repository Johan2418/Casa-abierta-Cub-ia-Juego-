# Portafolio 2025

![image info](./static/social/share-image.png)

## Configuración

Crea un archivo `.env` basado en `.env.example`

Descarga e instala [Node.js](https://nodejs.org/en/download/) y luego ejecuta estos comandos:

``` bash
# Instalar dependencias
npm install --force

# Servir en localhost:1234
npm run dev

# Compilar para producción en el directorio dist/
npm run build
```

## Bucle del juego

#### 0

- Tiempo
- Entradas

#### 1

- Jugador:pre-física (Entradas)

#### 2

- Vehículo Físico:pre-física (Jugador:pre-física)

#### 3

- Física

#### 4

- Estructura de Física (Física)
- Objetos (Física)

#### 5

- Vehículo Físico:post-física (Jugador:pre-física)

#### 6

- Jugador:post-física (Física, Vehículo Físico:post-física)

#### 7

- Vista (Entradas, Jugador:post-física)

#### 8

- Intro
- Ciclos de día
- Ciclos de año
- Clima (Ciclos de día, Ciclos de año)
- Zonas (Jugador:post-física)
- Vehículo Visual (Vehículo Físico:post-física, Entradas, Jugador:post-física, Vista)

#### 9

- Viento (Clima)
- Iluminación (Ciclos de día, Vista)
- Tornado (Ciclos de día, Vehículo Físico)
- Puntos Interactivos (Jugador:post-física)
- Pistas (Vehículo Visual)

#### 10

- Área++ (Vista, Vehículo Físico:post-física, Jugador:post-física, Viento)
- Follaje (Vehículo Visual, Vista)
- Niebla (Vista)
- Revelar (Ciclos de día)
- Terreno (Pistas)
- Rastros (Vehículo Físico)
- Suelo (Vista)
- Pasto (Vista, Viento)
- Hojas (Vista, Vehículo Físico)
- Relámpagos (Vista, Clima)
- Líneas de Lluvia (Vista, Clima, Revelar)
- Nieve (Vista, Clima, Revelar, Pistas)
- Tornado Visual (Tornado)
- Superficie de Agua (Clima, Vista)
- Bancos (Objetos)
- Ladrillos (Objetos)
- Cajas Explosivas (Objetos)
- Vallas (Objetos)
- Faroles (Objetos)
- Susurros (Jugador)

#### 13

- Grupo de instancias (Objetos, [Objetos específicos])

#### 14

- Audio (Vista, Objetos)
- Notificaciones
- Título (Vehículo Físico:post-física)

#### 998

- Renderizado

#### 999

- Monitoreo

## Blender

### Exportar

- Silencia el nodo de textura de paleta (cargado y configurado en Three.js `Material` directamente)
- Usa los presets de exportación correspondientes
- No uses compresión (se hará después)

### Comprimir

Ejecuta `npm run compress`

Hará lo siguiente

#### GLB

- Recorre la carpeta `static/` buscando archivos glb (ignorando archivos ya comprimidos)
- Comprime la textura incrustada con `etc1s --quality 255` (con pérdida, compatible con GPU)
- Genera nuevos archivos para preservar los originales

#### Archivos de textura

- Recorre la carpeta `static/` buscando archivos `png|jpg` (ignorando carpetas no relacionadas con modelos)
- Comprime con preset predeterminado a `--encode etc1s --qlevel 255` (con pérdida, compatible con GPU) o preset específico según la ruta
- Genera nuevos archivos para preservar los originales

#### Archivos de UI

- Recorre la carpeta `static/ui.` buscando archivos `png|jpg`
- Comprime a WebP

#### Recursos

- https://gltf-transform.dev/cli
- https://github.com/KhronosGroup/KTX-Software?tab=readme-ov-file
- https://github.khronos.org/KTX-Software/ktxtools/toktx.html