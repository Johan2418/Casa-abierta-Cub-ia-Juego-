# Configuración de Texturas para Career Area - Club de IA

## Resumen

Este documento explica cómo configurar las nuevas texturas del Club de IA en el modelo GLB para que se muestren correctamente en el juego.

## Texturas Disponibles

Las siguientes texturas han sido agregadas al código y están listas para usar:

1. `aiClub` → `careerAIClubTexture` → "Club de IA"
2. `machineLearning` → `careerMachineLearningTexture` → "Machine Learning"
3. `techCommunity` → `careerTechCommunityTexture` → "Comunidad Tech"
4. `reinforcementLearning` → `careerReinforcementLearningTexture` → "Aprendizaje por Refuerzo"
5. `dataScience` → `careerDataScienceTexture` → "Ciencia de Datos"
6. `computerVision` → `careerComputerVisionTexture` → "Visión Computacional"

## Configuración en Blender (Paso 3)

Para que las texturas se muestren correctamente en el juego, necesitas configurar el modelo GLB en Blender. Esta es la parte más importante del proceso.

### ¿Qué es userData?

`userData` es una propiedad especial de los objetos en Blender que permite almacenar información personalizada que luego el código del juego puede leer. En este caso, usamos `userData` para decirle al juego:
- Qué textura mostrar en cada línea
- Qué color usar para iluminar el texto
- Qué tamaño tiene la línea
- Si la línea tiene un final o no

### Pasos Detallados:

#### 1. Abrir el Modelo en Blender

- Abre Blender
- Ve a `File` → `Import` → `glTF 2.0 (.glb/.gltf)`
- Navega y selecciona el archivo del modelo que contiene las líneas de carrera
  - Probablemente está en `static/areas/areas.glb` o similar
  - También podría estar en `resources/models/bruno.glb`
- Haz clic en "Import glTF 2.0"

#### 2. Encontrar las Líneas de Carrera

Una vez que el modelo está cargado:

- En el panel de escena (parte superior derecha), busca objetos que tengan nombres que empiecen con `refLine`
  - Ejemplos: `refLine`, `refLine.001`, `refLine.002`, etc.
- Estos son los bloques negros donde se mostrarán los textos

**Tip:** Puedes usar la barra de búsqueda en el panel de escena y escribir "refLine" para filtrar solo esos objetos.

#### 3. Seleccionar una Línea

- En el panel de escena, haz clic en una línea (por ejemplo, `refLine.001`)
- O haz clic directamente en el objeto 3D en la vista
- El objeto seleccionado se verá resaltado (generalmente en color naranja)

#### 4. Abrir el Panel de Propiedades

- Presiona la tecla `N` para abrir el panel lateral de propiedades (si no está visible)
- O ve al menú `View` → `Sidebar`
- Haz clic en la pestaña que tiene un ícono de `📋` (Object Properties) en el panel de propiedades principal (parte inferior derecha)

#### 5. Configurar Custom Properties (userData)

En el panel de propiedades del objeto, desplázate hasta encontrar la sección **"Custom Properties"**:

- Si ya hay propiedades personalizadas, las verás listadas ahí
- Si no hay ninguna, verás un botón o sección vacía

**Para agregar/modificar propiedades:**

**⚠️ PROBLEMA COMÚN:** Si ves que las propiedades tienen valores numéricos (1.0, 1.000) o el tipo es "Decimal" en lugar de "String", necesitas cambiarlas.

1. **Propiedad `texture` (IMPORTANTE: debe ser tipo String y debe incluir "career"):**
   - Busca si ya existe una propiedad llamada `texture`
   - Si existe, haz clic en ella para editarla
   - **VERIFICAR TIPO:** En "Tipo" (Type), debe decir **"String"**. Si dice "Decimal" o "Float", cámbialo a "String"
   - Si no existe, haz clic en el botón `+` o "Nueva" para agregar una nueva propiedad
   - **CRÍTICO:** En "Tipo" (Type), selecciona **"String"** (no Decimal, no Float, no Int, debe ser String)
   - **Nombre:** `texture` (todo en minúsculas, sin espacios)
   - **Valor:** Establece uno de estos nombres (debe incluir "career" al inicio, sin comillas, solo el texto):
     - `careerAIClub` → mostrará "Club de IA"
     - `careerMachineLearning` → mostrará "Machine Learning"
     - `careerTechCommunity` → mostrará "Comunidad Tech"
     - `careerReinforcementLearning` → mostrará "Aprendizaje por Refuerzo"
     - `careerDataScience` → mostrará "Ciencia de Datos"
     - `careerComputerVision` → mostrará "Visión Computacional"
   - **NOTA IMPORTANTE:** El valor debe empezar con "career" porque el código busca `${userData.texture}Texture`, entonces `careerAIClub` se convierte en `careerAIClubTexture`
   - **ERROR COMÚN:** Si el valor es numérico como `1.0` o el tipo es "Decimal", NO funcionará. Debe ser String con el texto completo.

2. **Propiedad `color` (debe ser tipo String):**
   - Agrega o modifica una propiedad llamada `color`
   - **Tipo:** Selecciona **"String"**
   - **Nombre:** `color` (todo en minúsculas)
   - **Valor:** Establece uno de estos (todo en minúsculas, sin comillas):
     - `blue` → Azul (#5390ff)
     - `orange` → Naranja (#ff8039)
     - `purple` → Púrpura (#b65fff)
     - `green` → Verde (#a2ffab)

3. **Propiedad `size` (debe ser tipo Float/Decimal):**
   - Agrega o modifica una propiedad llamada `size`
   - **Tipo:** Selecciona **"Float"** o **"Decimal"**
   - **Nombre:** `size` (todo en minúsculas)
   - **Valor:** Establece un número, por ejemplo: `5.0` o `6.0`
   - Este número controla qué tan larga es la línea visible

4. **Propiedad `hasEnd` (debe ser tipo Boolean):**
   - Agrega o modifica una propiedad llamada `hasEnd`
   - **Tipo:** Selecciona **"Boolean"**
   - **Nombre:** `hasEnd` (todo en minúsculas)
   - **Valor:** Marca la casilla para `true` o déjala desmarcada para `false`
   - Esto indica si la línea tiene un final visible o no

#### 6. Repetir para Todas las Líneas

- Repite los pasos 3-5 para cada línea (`refLine`, `refLine.001`, `refLine.002`, etc.)
- Asigna diferentes texturas y colores a cada línea para crear variedad

#### 7. Guardar el Modelo

- Ve a `File` → `Export` → `glTF 2.0 (.glb/.gltf)`
- Navega a la carpeta donde está el modelo original
- Si te pregunta si quieres sobrescribir, selecciona "Yes"
- Haz clic en "Export glTF 2.0"

### Ejemplo Visual de Configuración:

Imagina que estás configurando `refLine.001` para mostrar "Club de IA":

**En Custom Properties deberías ver:**

```
📋 Custom Properties
   texture: "careerAIClub"
   color: "blue"
   size: "5.0"
   hasEnd: true
```

**Y para `refLine.002` para mostrar "Machine Learning":**

```
📋 Custom Properties
   texture: "careerMachineLearning"
   color: "orange"
   size: "6.0"
   hasEnd: true
```

**Para `refLine.003` mostrando "Ciencia de Datos":**

```
📋 Custom Properties
   texture: "careerDataScience"
   color: "purple"
   size: "5.5"
   hasEnd: true
```

**IMPORTANTE:** Nota que todos los valores de `texture` empiezan con `career` porque el código agrega `Texture` al final, entonces `careerAIClub` se convierte en `careerAIClubTexture`.

### Mapeo de Texturas

| Nombre en userData.texture | Nombre de la textura en Game.js | Texto mostrado |
|-------------------|---------------------|----------------|
| `careerAIClub` | `careerAIClubTexture` | "Club de IA" |
| `careerMachineLearning` | `careerMachineLearningTexture` | "Machine Learning" |
| `careerTechCommunity` | `careerTechCommunityTexture` | "Comunidad Tech" |
| `careerReinforcementLearning` | `careerReinforcementLearningTexture` | "Aprendizaje por Refuerzo" |
| `careerDataScience` | `careerDataScienceTexture` | "Ciencia de Datos" |
| `careerComputerVision` | `careerComputerVisionTexture` | "Visión Computacional" |

**Cómo funciona:**
- El código busca: `${userData.texture}Texture`
- Si `userData.texture = "careerAIClub"`, el código busca `careerAIClubTexture` en los recursos
- Por eso el valor en Blender debe ser `careerAIClub` (con "career" pero sin "Texture")

## Colores Disponibles

Los colores disponibles son:
- `blue` - Azul (#5390ff)
- `orange` - Naranja (#ff8039)
- `purple` - Púrpura (#b65fff)
- `green` - Verde (#a2ffab)

## Verificación

Después de configurar el modelo:

1. Exporta el modelo GLB con las nuevas configuraciones
2. Asegúrate de que los archivos `.ktx` de las texturas existan en `static/career/`
3. Ejecuta el juego y verifica que las texturas se muestren correctamente cuando te acerques a cada línea

## Notas Técnicas

- El código en `CareerArea.js` busca las texturas usando: `this.game.resources[`${line.group.userData.texture}Texture`]`
- Por lo tanto, si `userData.texture = "careerAIClub"`, el código buscará `careerAIClubTexture` en los recursos
- **CRÍTICO:** El valor en Blender debe incluir "career" al inicio (ej: `careerAIClub`, NO solo `aiClub`)
- Las texturas deben estar cargadas en `Game.js` (ya están agregadas)
- Los archivos `.ktx` deben existir en `static/career/` con los nombres correctos

## Solución de Problemas

**Las texturas no se muestran:**
- Verifica que los archivos `.ktx` existan en `static/career/`
- Verifica que el `userData.texture` coincida exactamente con los nombres de la tabla
- Verifica que las texturas estén cargadas en `Game.js`

**El color no es correcto:**
- Verifica que `userData.color` sea uno de: `blue`, `orange`, `purple`, `green`
- El color debe estar en minúsculas

**La línea no aparece:**
- Verifica que el objeto tenga el nombre correcto (debe comenzar con `refLine`)
- Verifica que tenga un hijo llamado `careerText` (el mesh que muestra el texto)
- Verifica que tenga un hijo llamado `stone` (el bloque que se eleva)

## Consejos Útiles

### Verificación Rápida

Después de configurar todas las líneas, puedes verificar que todo esté correcto:

1. **En Blender:**
   - Selecciona cada `refLine` y verifica en Custom Properties que tenga:
     - `texture`: uno de los 6 nombres válidos
     - `color`: uno de los 4 colores válidos
     - `size`: un número positivo
     - `hasEnd`: true o false

2. **Antes de exportar:**
   - Guarda el archivo de Blender (.blend) por si acaso
   - Verifica que los archivos `.ktx` existan en `static/career/`

3. **Después de exportar:**
   - Ejecuta el juego y acércate a cada línea
   - Cada línea debería mostrar su texto correspondiente con el color configurado
   - Si algo no aparece, revisa la consola del navegador para ver errores

### Orden de Implementación Recomendado

1. Primero: Crea las imágenes PNG usando el script
2. Segundo: Convierte PNG a .ktx usando toktx
3. Tercero: Configura el modelo GLB en Blender (este paso)
4. Cuarto: Exporta el modelo GLB
5. Quinto: Ejecuta el juego y verifica

### Trabajar con Múltiples Líneas

Si tienes muchas líneas que configurar:

1. Selecciona una línea y configura sus propiedades
2. Una vez configurada correctamente, puedes:
   - Copiar las propiedades manualmente a otras líneas
   - O usar el método "Copy Custom Properties" si Blender lo permite
3. Solo cambia el valor de `texture` y `color` para cada línea para crear variedad

