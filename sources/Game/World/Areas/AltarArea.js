import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { attribute, clamp, color, float, Fn, instancedArray, instanceIndex, luminance, max, min, mix, smoothstep, step, texture, uniform, uv, varying, vec2, vec3, vec4 } from 'three/tsl'
import gsap from 'gsap'
import { alea } from 'seedrandom'
import { Area } from './Area.js'

export class AltarArea extends Area
{
    constructor(model)
    {
        super(model)

        // Adaptar referencias faltantes
        this.adaptReferences()

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '💀 Altar',
                expanded: false,
            })
        }

        this.value = 0
        this.position = this.references.items.get('altar')[0].position.clone()

        // Asegurar que los objetos de la casa se carguen correctamente
        this.ensureHouseObjectsLoaded()
        
        // Agregar física a los objetos de la casa
        this.setHousePhysics()

        this.color = uniform(color('#ff544d'))
        this.emissive = uniform(8)
        this.progressUniform = uniform(0)

        this.setSounds()
        this.setBeam()
        this.setBeamParticles()
        this.setGlyphs()
        this.setCounter()
        this.setDeathZone()
        this.setData()
        this.setAchievement()

        // Offline counter
        if(!this.game.server.connected)
            this.updateText('...')
            
        this.game.server.events.on('disconnected', () =>
        {
            this.updateText('...')
        })

        // Debug
        if(this.game.debug.active)
        {
            this.game.debug.addThreeColorBinding(this.debugPanel, this.color.value, 'color')
            this.debugPanel.addBinding(this.emissive, 'value', { label: 'emissive', min: 0, max: 10, step: 0.1 })
        }
    }

    setSounds()
    {
        this.sounds = {}

        this.sounds.chimers = this.game.audio.register({
            path: 'sounds/magic/Ghostly Whisper Background Loop 9.mp3',
            autoplay: true,
            loop: true,
            volume: 0.15,
            positions: this.references.items.get('altar')[0].position,
            distanceFade: 20
        })

        this.sounds.deathBell1 = this.game.audio.register({
            path: 'sounds/bell/Death Hit.mp3',
            autoplay: false,
            loop: false,
            volume: 0.4
        })
        this.sounds.deathBell2 = this.game.audio.register({
            path: 'sounds/bell/Epic Bell Impact Hit.mp3',
            autoplay: false,
            loop: false,
            volume: 0.4
        })
    }

    adaptReferences()
    {
        // Adaptar referencia 'altar' si no existe
        if(!this.references.items.get('altar') || !this.references.items.get('altar')[0])
        {
            // Buscar refPoiHouse01Inte como alternativa (puede estar como poiHouse o poiHouse01Inte)
            let poiHouseRef = this.references.items.get('poiHouse01Inte') || 
                             this.references.items.get('poiHouse')
            
            // Si no se encuentra por referencia, buscar directamente en el modelo
            if(!poiHouseRef || !poiHouseRef[0])
            {
                this.model.traverse((child) =>
                {
                    const name = child.name.toLowerCase()
                    if(name.includes('poihouse') || name.includes('refpoihouse'))
                    {
                        poiHouseRef = [child]
                    }
                })
            }
            
            if(poiHouseRef && poiHouseRef[0])
            {
                // Agregar a las referencias como 'altar'
                if(!this.references.items.has('altar'))
                {
                    this.references.items.set('altar', [poiHouseRef[0]])
                }
            }
            else
            {
                // Usar la posición del modelo padre como fallback
                const dummyAltar = new THREE.Group()
                dummyAltar.position.copy(this.model.position)
                dummyAltar.name = 'altar'
                if(!this.references.items.has('altar'))
                {
                    this.references.items.set('altar', [dummyAltar])
                }
            }
        }

        // Adaptar referencia 'counter' si no existe
        if(!this.references.items.get('counter') || !this.references.items.get('counter')[0])
        {
            // Crear referencia dummy en una posición relativa al altar
            const altarRef = this.references.items.get('altar')[0]
            const dummyCounter = new THREE.Group()
            dummyCounter.position.copy(altarRef.position)
            dummyCounter.position.y += 3 // Por encima del altar
            dummyCounter.name = 'counter'
            if(!this.references.items.has('counter'))
            {
                this.references.items.set('counter', [dummyCounter])
            }
        }
    }

    ensureHouseObjectsLoaded()
    {
        // Asegurar que los objetos de la casa se hayan cargado correctamente
        // Si algún objeto no se cargó automáticamente, cargarlo manualmente
        const houseObjectNames = []
        const houseObjectsFound = []
        
        // Helper: calcular normales si no existen
        const computeNormalsIfNeeded = (geometry) =>
        {
            if(!geometry.attributes.normal)
            {
                geometry.computeVertexNormals()
            }
        }
        
        // Helper: asegurar que todos los meshes tengan normales
        const ensureNormals = (object3D) =>
        {
            object3D.traverse((child) =>
            {
                if(child.isMesh && child.geometry)
                {
                    computeNormalsIfNeeded(child.geometry)
                }
            })
        }
        
        this.model.traverse((child) =>
        {
            if(child.isMesh || child.children.length > 0)
            {
                const name = child.name.toLowerCase()
                const isHouseMesh = name.includes('house_mesh') || name.startsWith('house_mesh_')
                const isPlano = name === 'plano' || name.includes('plano')
                const isTube = name.includes('tube') || name.startsWith('tube.')
                
                if((isHouseMesh || isPlano || isTube) && !child.userData.preventAutoAdd)
                {
                    houseObjectsFound.push({
                        name: child.name,
                        isMesh: child.isMesh,
                        hasGeometry: child.isMesh && child.geometry !== undefined,
                        hasNormals: child.isMesh && child.geometry && child.geometry.attributes.normal !== undefined,
                        childrenCount: child.children.length
                    })
                    
                    // Verificar si este objeto ya fue cargado
                    const alreadyLoaded = this.objects.items.some(obj => 
                        obj.visual && obj.visual.object3D === child
                    )
                    
                    if(!alreadyLoaded && (child.isMesh || child.children.length > 0))
                    {
                        houseObjectNames.push(child.name)
                        
                        // Asegurar normales antes de cargar
                        ensureNormals(child)
                        
                        // Cargar el objeto manualmente si no se cargó automáticamente
                        try
                        {
                            const object = this.game.objects.addFromModel(
                                child,
                                {
                                    updateMaterials: false, // Desactivar actualización de materiales para evitar errores
                                    castShadow: true,
                                    receiveShadow: true
                                },
                                {
                                    position: child.position.clone().add(this.model.position),
                                    rotation: child.quaternion.clone(),
                                    sleeping: true
                                }
                            )
                            
                            if(object)
                            {
                                // Asegurar que el objeto visual esté en la escena
                                if(object.visual && object.visual.object3D)
                                {
                                    ensureNormals(object.visual.object3D)
                                    
                                    // Verificar que esté en la escena
                                    if(!object.visual.object3D.parent && object.visual.parent)
                                    {
                                        object.visual.parent.add(object.visual.object3D)
                                    }
                                    
                                    // Asegurar visibilidad
                                    object.visual.object3D.visible = true
                                    object.visual.object3D.traverse((c) => { if(c.isMesh) c.visible = true })
                                }
                                
                                this.objects.items.push(object)
                                
                                // Agregar a hideable si corresponde
                                if(object.visual && (!object.physical || object.physical?.type === 'fixed'))
                                {
                                    if(!this.objects.hideable.includes(object.visual.object3D))
                                    {
                                        this.objects.hideable.push(object.visual.object3D)
                                    }
                                }
                            }
                        }
                        catch(error)
                        {
                            console.warn(`[AltarArea] Error loading house object "${child.name}":`, error)
                        }
                    }
                }
            }
        })
        
        // Debug: mostrar objetos de la casa encontrados
        console.log('[AltarArea] House objects found in model:', houseObjectsFound)
        if(houseObjectNames.length > 0)
        {
            console.log('[AltarArea] House objects manually loaded:', houseObjectNames)
        }
        
        // Verificar objetos cargados en this.objects.items - LISTAR TODOS LOS NOMBRES
        const allObjectNames = []
        this.objects.items.forEach(obj => {
            if(obj.visual && obj.visual.object3D)
            {
                allObjectNames.push(obj.visual.object3D.name)
            }
        })
        console.log('[AltarArea] All object names in objects.items:', allObjectNames)
        
        // Verificar objetos que podrían ser de la casa
        const loadedHouseObjects = this.objects.items.filter(obj => 
            obj.visual && obj.visual.object3D && (
                obj.visual.object3D.name.toLowerCase().includes('house_mesh') ||
                obj.visual.object3D.name.toLowerCase().includes('plano') ||
                obj.visual.object3D.name.toLowerCase().includes('tube') ||
                obj.visual.object3D.name.toLowerCase().includes('house') ||
                obj.visual.object3D.name.toLowerCase().includes('poi')
            )
        )
        console.log('[AltarArea] Potential house objects in objects.items:', loadedHouseObjects.length)
        if(loadedHouseObjects.length > 0)
        {
            console.log('[AltarArea] Potential house object names:', loadedHouseObjects.map(obj => obj.visual.object3D.name))
        }
    }

    setHousePhysics()
    {
        // Helper: calcular normales si no existen
        const computeNormalsIfNeeded = (geometry) =>
        {
            if(!geometry.attributes.normal)
            {
                geometry.computeVertexNormals()
            }
        }
        
        // Helper: construir colliders trimesh desde la geometría del objeto
        const buildTrimeshCollidersFromObject = (object3D) =>
        {
            const colliders = []
            
            object3D.traverse((child) =>
            {
                if(child.isMesh && child.geometry)
                {
                    const geometry = child.geometry
                    
                    // Asegurar que la geometría tiene los datos necesarios
                    if(!geometry.attributes.position)
                        return
                    
                    // Asegurar normales para evitar errores de renderizado
                    computeNormalsIfNeeded(geometry)

                    const positions = geometry.attributes.position.array
                    const indices = geometry.index ? geometry.index.array : null

                    // Calcular posición y rotación relativas al objeto padre (object3D)
                    const childWorldMatrix = new THREE.Matrix4()
                    child.updateWorldMatrix(true, false)
                    childWorldMatrix.copy(child.matrixWorld)
                    
                    const parentWorldMatrix = new THREE.Matrix4()
                    object3D.updateWorldMatrix(true, false)
                    parentWorldMatrix.copy(object3D.matrixWorld)
                    
                    const invParentMatrix = new THREE.Matrix4().copy(parentWorldMatrix).invert()
                    const localMatrix = new THREE.Matrix4().multiplyMatrices(invParentMatrix, childWorldMatrix)
                    
                    const position = new THREE.Vector3()
                    const quaternion = new THREE.Quaternion()
                    const scale = new THREE.Vector3()
                    localMatrix.decompose(position, quaternion, scale)

                    if(indices && indices.length > 0)
                    {
                        // Usar trimesh si hay índices
                        colliders.push({
                            shape: 'trimesh',
                            parameters: [positions, indices],
                            position: position,
                            quaternion: quaternion,
                            friction: 0.7
                        })
                    }
                    else if(positions && positions.length > 0)
                    {
                        // Usar convex hull si no hay índices
                        colliders.push({
                            shape: 'hull',
                            parameters: [positions],
                            position: position,
                            quaternion: quaternion,
                            friction: 0.7
                        })
                    }
                }
            })

            return colliders.length > 0 ? colliders : null
        }

        // Iterar sobre los objetos cargados y agregar física a los de la casa
        let physicsAddedCount = 0
        const houseObjectNames = []
        
        for(const object of this.objects.items)
        {
            if(!object.visual || !object.visual.object3D) continue

            const object3D = object.visual.object3D
            const name = object3D.name.toLowerCase()

            // Identificar objetos de la casa (buscar por nombre completo o parcial)
            // Nota: Los nombres ahora incluyen "Physical" (ej: house_mesh_01Physical)
            // El sistema automático puede crear física, pero verificamos si necesita colliders
            const isHouseMesh = name.includes('house_mesh') || name.startsWith('house_mesh_')
            const isPlano = name === 'plano' || name.includes('plano')
            const isTube = name.includes('tube') || name.startsWith('tube') || name.startsWith('tube.')

            if((isHouseMesh || isPlano || isTube))
            {
                const hasPhysics = !!object.physical
                const hasColliders = object.physical && object.physical.colliders && object.physical.colliders.length > 0
                const isEnabled = object.physical && object.physical.body && object.physical.body.isEnabled()
                
                houseObjectNames.push({
                    name: object3D.name,
                    hasPhysics: hasPhysics,
                    hasColliders: hasColliders,
                    isEnabled: isEnabled,
                    visible: object3D.visible,
                    inScene: !!object3D.parent,
                    position: object3D.position.clone()
                })
                
                // Si NO tiene física O si tiene física pero sin colliders, agregar/arreglar física
                if(!object.physical || !hasColliders)
                {
                    if(object.physical && !hasColliders)
                    {
                        console.log(`[AltarArea] ⚠️ ${object3D.name} has physics but NO COLLIDERS! Replacing with complete physics...`)
                        // Remover la física anterior que no tiene colliders
                        // El sistema automático creó física pero sin colliders, necesitamos reemplazarla
                        if(object.physical.body)
                        {
                            // Deshabilitar y remover el body anterior (se limpiará automáticamente)
                            object.physical.body.setEnabled(false)
                        }
                        object.physical = null // Forzar recreación
                    }
                    if(!object.physical)
                    {
                        console.log(`[AltarArea] Creating physics for ${object3D.name}...`)
                    }
                    
                    // Asegurar normales antes de agregar física
                    object3D.traverse((child) =>
                    {
                        if(child.isMesh && child.geometry && !child.geometry.attributes.normal)
                        {
                            child.geometry.computeVertexNormals()
                        }
                    })
                    
                    // Crear colliders desde la geometría
                    const colliders = buildTrimeshCollidersFromObject(object3D)
                    
                    if(colliders && colliders.length > 0)
                    {
                        console.log(`[AltarArea] ✓ Found ${colliders.length} collider(s) for ${object3D.name}`)
                        
                        // Obtener posición y rotación actuales del objeto (en espacio mundial)
                        object3D.updateWorldMatrix(true, true)
                        const worldPosition = new THREE.Vector3()
                        const worldQuaternion = new THREE.Quaternion()
                        object3D.getWorldPosition(worldPosition)
                        object3D.getWorldQuaternion(worldQuaternion)

                        // Crear física estática (fixed) directamente CON colliders
                        const physicalDescription = {
                            type: 'fixed',
                            position: worldPosition,
                            rotation: worldQuaternion,
                            friction: 0.7,
                            colliders: colliders,
                            category: 'object'
                        }

                        // Crear el objeto físico (reemplazará el anterior si existía)
                        object.physical = this.game.physics.getPhysical(physicalDescription)
                        
                        if(!object.physical || !object.physical.body)
                        {
                            console.error(`[AltarArea] ERROR: Failed to create physics for ${object3D.name}`)
                            // No agregar física, continuar con el siguiente objeto
                        }
                        else
                        {
                            console.log(`[AltarArea] ✓ Physics created for ${object3D.name}`)
                            console.log(`  - Type: ${object.physical.type}`)
                            console.log(`  - Colliders: ${colliders.length}`)
                            console.log(`  - Body enabled: ${object.physical.body.isEnabled()}`)
                            console.log(`  - Body position:`, object.physical.body.translation())
                            console.log(`  - Visual position:`, worldPosition)
                            
                            // CRÍTICO: Para objetos fixed, asegurar que el body esté ACTIVO
                            // Los objetos fixed deben estar ENABLED para que colisionen
                            if(!object.physical.body.isEnabled())
                            {
                                console.log(`  - Enabling physics body for ${object3D.name}`)
                                object.physical.body.setEnabled(true)
                            }
                            
                            // Asegurar que el body NO esté durmiendo (para objetos fixed que necesitan colisionar)
                            if(object.physical.body.isSleeping())
                            {
                                console.log(`  - Waking up physics body for ${object3D.name}`)
                                object.physical.body.wakeUp()
                            }
                            
                            // Vincular física con objeto visual (como hace Objects.add)
                            object.physical.body.userData = { object: object }
                            if(object.visual)
                            {
                                object.visual.object3D.userData.object = object
                            }
                            
                            // SINCRONIZAR física con visual - Para objetos fixed, física sigue a visual
                            if(object.visual && object.physical && object.physical.type === 'fixed')
                            {
                                // Para objetos fixed, la física debe seguir la posición visual
                                // Actualizar la posición física para que coincida con la visual
                                const visualWorldPos = new THREE.Vector3()
                                const visualWorldQuat = new THREE.Quaternion()
                                object.visual.object3D.getWorldPosition(visualWorldPos)
                                object.visual.object3D.getWorldQuaternion(visualWorldQuat)
                                
                                // Sincronizar física con visual (física sigue a visual para objetos fixed)
                                object.physical.body.setTranslation(visualWorldPos, true)
                                object.physical.body.setRotation(visualWorldQuat, true)
                                
                                // IMPORTANTE: Para objetos fixed, el visual NO debe seguir a la física
                                // porque la física es estática. El visual mantiene su posición original.
                                // NO hacer: object.visual.object3D.position.copy(object.physical.body.translation())
                                
                                console.log(`  - Synced: physics position = visual position`)
                            }
                            
                            // NO agregar a hideable - queremos que la casa siempre sea visible
                            // Los objetos de la casa no deben ser ocultados por frustum culling
                            // if(object.visual && object.physical?.type === 'fixed')
                            // {
                            //     if(!this.objects.hideable.includes(object.visual.object3D))
                            //     {
                            //         this.objects.hideable.push(object.visual.object3D)
                            //     }
                            // }
                            
                            physicsAddedCount++
                        }
                    }
                }
            }
        }
        
        console.log(`[AltarArea] Physics added to ${physicsAddedCount} house objects`)
        console.log(`[AltarArea] House objects details:`, houseObjectNames)
        
        // Verificar visibilidad y posición de todos los objetos de la casa
        const allHouseObjects = this.objects.items.filter(obj => 
            obj.visual && obj.visual.object3D && (
                obj.visual.object3D.name.toLowerCase().includes('house_mesh') ||
                obj.visual.object3D.name.toLowerCase().includes('plano') ||
                obj.visual.object3D.name.toLowerCase().includes('tube')
            )
        )
        
        console.log(`[AltarArea] All house objects status:`)
        allHouseObjects.forEach((obj, index) => {
            const o3d = obj.visual.object3D
            
            // Obtener posición mundial
            o3d.updateWorldMatrix(true, false)
            const worldPos = new THREE.Vector3()
            o3d.getWorldPosition(worldPos)
            
            // Calcular distancia al área óptima
            const distanceToOptimalArea = Math.hypot(
                worldPos.x - this.game.view.optimalArea.position.x,
                worldPos.z - this.game.view.optimalArea.position.z
            )
            const isWithinOptimalArea = distanceToOptimalArea <= this.game.view.optimalArea.radius
            
            // Contar meshes y verificar su visibilidad
            let meshCount = 0
            let visibleMeshCount = 0
            o3d.traverse((child) => {
                if(child.isMesh)
                {
                    meshCount++
                    if(child.visible) visibleMeshCount++
                }
            })
            
            // Verificar si está en hideable
            const isInHideable = this.objects.hideable.includes(o3d)
            
            console.log(`  [${index}] ${o3d.name}:`, {
                visible: o3d.visible,
                inScene: !!o3d.parent,
                localPosition: o3d.position.toArray(),
                worldPosition: worldPos.toArray(),
                distanceToOptimalArea: distanceToOptimalArea.toFixed(2),
                optimalAreaRadius: this.game.view.optimalArea.radius.toFixed(2),
                isWithinOptimalArea: isWithinOptimalArea,
                isInHideable: isInHideable,
                hasPhysics: !!obj.physical,
                material: o3d.material?.name || (o3d.material ? 'custom' : 'none'),
                children: o3d.children.length,
                meshCount: meshCount,
                visibleMeshCount: visibleMeshCount,
                isMesh: o3d.isMesh
            })
            
            // Asegurar visibilidad - FORZAR visibilidad para objetos de la casa
            if(!o3d.visible)
            {
                console.warn(`  [${index}] ${o3d.name} is not visible! Setting to visible.`)
                o3d.visible = true
            }
            
            // Asegurar que todos los hijos también estén visibles
            o3d.traverse((child) => {
                if(!child.visible)
                {
                    child.visible = true
                }
            })
            
            // PROBLEMA PRINCIPAL: Los objetos están fuera del área visible (71.82 > 46.53)
            // Forzar visibilidad si están cerca o si es parte de la casa
            if(!isWithinOptimalArea)
            {
                console.warn(`  [${index}] ${o3d.name} is OUTSIDE optimal area (${distanceToOptimalArea.toFixed(2)} > ${this.game.view.optimalArea.radius.toFixed(2)})`)
                // Aún así, forzar visibilidad para objetos de la casa
                o3d.visible = true
                o3d.traverse((child) => { child.visible = true })
            }
            
            // REMOVER de hideable para que la casa siempre sea visible
            if(isInHideable)
            {
                console.warn(`  [${index}] ${o3d.name} is in hideable - REMOVING to keep house always visible`)
                const hideableIndex = this.objects.hideable.indexOf(o3d)
                if(hideableIndex !== -1)
                {
                    this.objects.hideable.splice(hideableIndex, 1)
                }
                // Forzar visibilidad para objetos de la casa independientemente del frustum
                o3d.visible = true
                o3d.traverse((child) => { child.visible = true })
            }
            
            // Asegurar que la casa siempre sea visible, incluso si está fuera del área óptima
            o3d.visible = true
            o3d.traverse((child) => { 
                child.visible = true
                if(child.isMesh)
                {
                    child.frustumCulled = false // Desactivar frustum culling para la casa
                }
            })
            
            // Asegurar que esté en la escena
            if(!o3d.parent && obj.visual.parent)
            {
                console.warn(`  [${index}] ${o3d.name} is not in scene! Adding to parent.`)
                obj.visual.parent.add(o3d)
            }
            
            // Asegurar materiales y normales para todos los meshes (incluyendo hijos)
            let fixedMaterials = 0
            let fixedNormals = 0
            o3d.traverse((child) => {
                if(child.isMesh)
                {
                    // Asegurar geometría
                    if(!child.geometry)
                    {
                        console.warn(`  [${index}] ${o3d.name} -> ${child.name} mesh has no geometry!`)
                        return
                    }
                    
                    // Asegurar normales
                    if(!child.geometry.attributes.normal)
                    {
                        console.warn(`  [${index}] ${o3d.name} -> ${child.name} mesh has no normals! Computing...`)
                        child.geometry.computeVertexNormals()
                        fixedNormals++
                    }
                    
                    // Asegurar material - SIEMPRE crear/actualizar material
                    let needsMaterial = false
                    if(!child.material)
                    {
                        console.warn(`  [${index}] ${o3d.name} -> ${child.name} mesh has no material! Creating default...`)
                        needsMaterial = true
                    }
                    else if(!child.material.name || child.material.name === '')
                    {
                        console.warn(`  [${index}] ${o3d.name} -> ${child.name} mesh material has no name! Fixing...`)
                        needsMaterial = true
                    }
                    
                    if(needsMaterial)
                    {
                        // Usar colores acordes al diseño del proyecto
                        // Colores cálidos para la casa: beige/naranja claro que combinan con el terreno
                        const houseColors = [
                            0xffcf8b, // Beige claro (similar al terreno)
                            0xffb646, // Naranja claro
                            0xf5d5a8, // Beige más claro
                            0xe8c89e, // Beige medio
                        ]
                        
                        // MEJORADO: Extraer número del nombre para variar colores
                        // Ej: "house_mesh_07Physical" -> 7, "house_mesh_12Physical" -> 12
                        let meshNumber = 0
                        const numberMatch = o3d.name.match(/(\d+)/)
                        if(numberMatch)
                        {
                            meshNumber = parseInt(numberMatch[1], 10)
                        }
                        else
                        {
                            // Si no hay número, usar hash del nombre completo
                            meshNumber = (o3d.name + child.name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
                        }
                        
                        // Colores especiales para ciertos meshes
                        let selectedColor = null
                        if(meshNumber >= 7 && meshNumber <= 9)
                        {
                            // house_mesh_07, 08, 09 → Negro
                            selectedColor = new THREE.Color(0x000000) // Negro
                        }
                        else if(meshNumber === 10)
                        {
                            // house_mesh_10 → Rojo
                            selectedColor = new THREE.Color(0xff0000) // Rojo
                        }
                        else
                        {
                            // Para los demás, usar la paleta de colores cálidos
                            const colorIndex = meshNumber % houseColors.length
                            selectedColor = new THREE.Color(houseColors[colorIndex])
                        }
                        
                        // Nombre único que incluye el color para evitar unificación
                        // Esto asegura que cada material con color diferente se procese por separado
                        let colorSuffix = ''
                        if(meshNumber >= 7 && meshNumber <= 9)
                        {
                            colorSuffix = '_black'
                        }
                        else if(meshNumber === 10)
                        {
                            colorSuffix = '_red'
                        }
                        else
                        {
                            const colorIndex = meshNumber % houseColors.length
                            colorSuffix = `_color${colorIndex}`
                        }
                        
                        const uniqueName = `house_${o3d.name}_${child.name}${colorSuffix}`.replace(/[^a-zA-Z0-9_]/g, '_')
                        
                        // Crear un material estándar con color del juego
                        // selectedColor ya es un THREE.Color
                        child.material = new THREE.MeshStandardMaterial({ 
                            color: selectedColor.clone(), // Clonar el color para evitar referencias compartidas
                            name: uniqueName // Nombre único que incluye el color
                        })
                        
                        // Verificar que el color se asignó correctamente
                        if(!child.material.color || child.material.color.r === undefined)
                        {
                            console.warn(`  [${index}] ${o3d.name} -> ${child.name} material color not set correctly! Fixing...`)
                            child.material.color = materialColor.clone()
                        }
                        
                        fixedMaterials++
                    }
                    
                    // Si el material no tiene nombre, asignarle uno único
                    if(child.material && (!child.material.name || child.material.name === '' || child.material.name === 'default'))
                    {
                        // Extraer número para el nombre
                        const nameNumberMatch = o3d.name.match(/(\d+)/)
                        const nameMeshNumber = nameNumberMatch ? parseInt(nameNumberMatch[1], 10) : 0
                        
                        let nameColorSuffix = ''
                        if(nameMeshNumber >= 7 && nameMeshNumber <= 9)
                        {
                            nameColorSuffix = '_black'
                        }
                        else if(nameMeshNumber === 10)
                        {
                            nameColorSuffix = '_red'
                        }
                        else
                        {
                            nameColorSuffix = `_color${nameMeshNumber % 6}`
                        }
                        
                        child.material.name = `house_${o3d.name}_${child.name}${nameColorSuffix}`.replace(/[^a-zA-Z0-9_]/g, '_')
                    }
                    
                    // Asegurar que el material tenga las propiedades necesarias
                    if(child.material)
                    {
                        if(!child.material.userData)
                        {
                            child.material.userData = {}
                        }
                        child.material.userData.prevent = false
                        
                        // Asegurar que tenga color si no lo tiene (usar color del juego)
                        if(!child.material.color)
                        {
                            child.material.color = new THREE.Color(0xffcf8b) // Beige claro
                        }
                        
                        // Si el material es gris por defecto, cambiarlo a color del juego
                        if(child.material.color.r === child.material.color.g && 
                           child.material.color.g === child.material.color.b &&
                           child.material.color.r < 0.85) // Es gris oscuro/claro
                        {
                            const nameHash = o3d.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
                            const houseColors = [0xffcf8b, 0xffb646, 0xf5d5a8, 0xe8c89e]
                            child.material.color.setHex(houseColors[nameHash % houseColors.length])
                        }
                        
                        // Asegurar que tenga opacity
                        if(typeof child.material.opacity === 'undefined')
                        {
                            child.material.opacity = 1.0
                        }
                    }
                    
                    // Asegurar sombras
                    child.castShadow = true
                    child.receiveShadow = true
                    
                    // Asegurar visibilidad
                    child.visible = true
                }
            })
            
            if(fixedMaterials > 0 || fixedNormals > 0)
            {
                console.log(`  [${index}] ${o3d.name} fixed: ${fixedMaterials} materials, ${fixedNormals} normals`)
            }
            
            // Actualizar materiales del objeto completo usando el método estándar
            // IMPORTANTE: Asignar colores ANTES de procesar con el sistema de materiales
            try
            {
                // Primero: Asegurar que TODOS los meshes tengan material con color válido
                o3d.traverse((child) => {
                    if(child.isMesh && child.material)
                    {
                        // CRÍTICO: Asignar color ANTES de cualquier procesamiento
                        // El sistema necesita un THREE.Color válido
                        // MEJORADO: Usar el número del mesh para variar los colores
                        
                        // Extraer número del nombre del objeto (ej: "house_mesh_07Physical" -> 7, "house_mesh_12Physical" -> 12)
                        let meshNumber = 0
                        const numberMatch = o3d.name.match(/(\d+)/)
                        if(numberMatch)
                        {
                            meshNumber = parseInt(numberMatch[1], 10)
                        }
                        else
                        {
                            // Si no hay número, usar hash del nombre completo
                            meshNumber = (o3d.name + child.name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
                        }
                        
                        // Colores cálidos del juego - variados para la casa
                        const houseColors = [
                            new THREE.Color(0xffcf8b), // Beige claro (similar al terreno)
                            new THREE.Color(0xffb646), // Naranja claro
                            new THREE.Color(0xf5d5a8), // Beige más claro
                            new THREE.Color(0xe8c89e), // Beige medio
                            new THREE.Color(0xffd4a3), // Beige anaranjado
                            new THREE.Color(0xffa852), // Naranja medio
                        ]
                        
                        // Colores especiales para ciertos meshes
                        let selectedColor = null
                        if(meshNumber >= 7 && meshNumber <= 9)
                        {
                            // house_mesh_07, 08, 09 → Negro
                            selectedColor = new THREE.Color(0x000000) // Negro
                        }
                        else if(meshNumber === 10)
                        {
                            // house_mesh_10 → Rojo
                            selectedColor = new THREE.Color(0xff0000) // Rojo
                        }
                        else
                        {
                            // Para los demás, usar la paleta de colores cálidos
                            const colorIndex = meshNumber % houseColors.length
                            selectedColor = houseColors[colorIndex]
                        }
                        
                        if(!child.material.color || typeof child.material.color.r === 'undefined')
                        {
                            // Crear color nuevo
                            child.material.color = selectedColor.clone()
                        }
                        else
                        {
                            // Verificar si es gris/blanco y cambiarlo
                            const r = child.material.color.r
                            const g = child.material.color.g
                            const b = child.material.color.b
                            const isGrey = Math.abs(r - g) < 0.01 && Math.abs(g - b) < 0.01
                            const isWhite = isGrey && r >= 0.9
                            const isDarkGrey = isGrey && r < 0.85
                            
                            // SIEMPRE reemplazar si es gris/blanco o si queremos forzar el color
                            // También forzar el color para asegurar que se aplique correctamente
                            if(isWhite || isDarkGrey || (r === 1 && g === 1 && b === 1))
                            {
                                child.material.color.copy(selectedColor)
                            }
                        }
                        
                        // CRÍTICO: Forzar el color DESPUÉS de verificar, para asegurar que siempre esté
                        // Esto previene el error "baseColor is undefined"
                        if(selectedColor && child.material.color)
                        {
                            // Asegurar que el color coincida con el seleccionado
                            const currentR = child.material.color.r
                            const currentG = child.material.color.g
                            const currentB = child.material.color.b
                            const targetR = selectedColor.r
                            const targetG = selectedColor.g
                            const targetB = selectedColor.b
                            
                            // Si el color actual no coincide con el objetivo, forzarlo
                            if(Math.abs(currentR - targetR) > 0.01 || 
                               Math.abs(currentG - targetG) > 0.01 || 
                               Math.abs(currentB - targetB) > 0.01)
                            {
                                child.material.color.copy(selectedColor)
                            }
                        }
                        
                        // Asignar nombre único para cada material con el COLOR incluido
                        // Esto asegura que cada material con color diferente se procese por separado
                        // NOTA: meshNumber ya fue declarado arriba, no redeclararlo
                        let colorSuffix = ''
                        if(meshNumber >= 7 && meshNumber <= 9)
                        {
                            colorSuffix = '_black'
                        }
                        else if(meshNumber === 10)
                        {
                            colorSuffix = '_red'
                        }
                        else
                        {
                            const houseColors = [0xffcf8b, 0xffb646, 0xf5d5a8, 0xe8c89e, 0xffd4a3, 0xffa852]
                            const colorIndex = meshNumber % houseColors.length
                            colorSuffix = `_color${colorIndex}`
                        }
                        
                        // Nombre único que incluye el color para evitar que se unifiquen
                        child.material.name = `house_${o3d.name}_${child.name}${colorSuffix}`.replace(/[^a-zA-Z0-9_]/g, '_')
                        
                        // Asegurar propiedades necesarias
                        if(!child.material.userData)
                        {
                            child.material.userData = {}
                        }
                        child.material.userData.prevent = false
                        
                        // Asegurar opacity
                        if(typeof child.material.opacity === 'undefined')
                        {
                            child.material.opacity = 1.0
                        }
                        
                        // Verificar que el color sea válido después de todas las asignaciones
                        if(!child.material.color || typeof child.material.color.r !== 'number' || isNaN(child.material.color.r))
                        {
                            console.error(`  [${index}] ${o3d.name} -> ${child.name} INVALID COLOR after setup!`, child.material.color)
                            child.material.color = new THREE.Color(0xffcf8b) // Fallback
                        }
                    }
                })
                
                // Segundo: Actualizar los materiales usando el sistema del juego
                // Esto convertirá los MeshStandardMaterial a MeshDefaultMaterial con el color correcto
                this.game.materials.updateObject(o3d)
                
                // Tercero: CRÍTICO - Re-aplicar colores DESPUÉS del procesamiento
                // El sistema puede haber procesado los materiales pero necesitamos asegurar los colores
                o3d.traverse((child) => {
                    if(child.isMesh && child.material)
                    {
                        // Extraer número del mesh
                        let meshNumber = 0
                        const numberMatch = o3d.name.match(/(\d+)/)
                        if(numberMatch)
                        {
                            meshNumber = parseInt(numberMatch[1], 10)
                        }
                        
                        // Determinar color objetivo según el número
                        let targetColor = null
                        if(meshNumber >= 7 && meshNumber <= 9)
                        {
                            targetColor = new THREE.Color(0x000000) // Negro
                        }
                        else if(meshNumber === 10)
                        {
                            targetColor = new THREE.Color(0xff0000) // Rojo
                        }
                        else
                        {
                            const houseColors = [
                                new THREE.Color(0xffcf8b), // Beige claro
                                new THREE.Color(0xffb646), // Naranja claro
                                new THREE.Color(0xf5d5a8), // Beige más claro
                                new THREE.Color(0xe8c89e), // Beige medio
                                new THREE.Color(0xffd4a3), // Beige anaranjado
                                new THREE.Color(0xffa852), // Naranja medio
                            ]
                            const colorIndex = meshNumber % houseColors.length
                            targetColor = houseColors[colorIndex]
                        }
                        
                        // Verificar y aplicar color al material procesado
                        if(targetColor && child.material)
                        {
                            // Si el material procesado es MeshDefaultMaterial, necesitamos actualizar su colorNode
                            // Pero primero verificamos si tiene color en el material base
                            if(child.material.color)
                            {
                                // Verificar si es blanco/gris y reemplazarlo
                                const r = child.material.color.r || 0
                                const g = child.material.color.g || 0
                                const b = child.material.color.b || 0
                                const isGrey = Math.abs(r - g) < 0.01 && Math.abs(g - b) < 0.01
                                const isWhite = isGrey && r >= 0.9
                                
                                if(isWhite || (r === 1 && g === 1 && b === 1) || 
                                   !child.material.color.r || isNaN(child.material.color.r))
                                {
                                    child.material.color.copy(targetColor)
                                }
                            }
                            else
                            {
                                // Si no tiene color, asignarlo
                                child.material.color = targetColor.clone()
                            }
                        }
                    }
                })
            }
            catch(error)
            {
                console.error(`  [${index}] ${o3d.name} ERROR updating materials:`, error)
                console.error(`  Stack:`, error.stack)
            }
            
            // Si el objeto no tiene física pero debería tenerla (tube013, etc.)
            if(!obj.physical && (o3d.name.toLowerCase().includes('tube') || o3d.name.toLowerCase().includes('plano')))
            {
                console.warn(`  [${index}] ${o3d.name} should have physics but doesn't! Adding...`)
                
                // Asegurar normales antes de agregar física
                o3d.traverse((child) =>
                {
                    if(child.isMesh && child.geometry && !child.geometry.attributes.normal)
                    {
                        child.geometry.computeVertexNormals()
                    }
                })
                
                // Crear colliders desde la geometría
                const colliders = buildTrimeshCollidersFromObject(o3d)
                
                if(!colliders || colliders.length === 0)
                {
                    console.warn(`[AltarArea] WARNING: No colliders generated for ${o3d.name}! Geometry may be invalid or empty.`)
                    // Intentar crear un collider básico usando la geometría del mesh principal
                    if(o3d.isMesh && o3d.geometry)
                    {
                        const positions = o3d.geometry.attributes.position?.array
                        const indices = o3d.geometry.index?.array
                        
                        if(positions && positions.length > 0)
                        {
                            const basicColliders = []
                            if(indices && indices.length > 0)
                            {
                                basicColliders.push({
                                    shape: 'trimesh',
                                    parameters: [positions, indices],
                                    position: { x: 0, y: 0, z: 0 },
                                    quaternion: { x: 0, y: 0, z: 0, w: 1 },
                                    friction: 0.7
                                })
                            }
                            else
                            {
                                basicColliders.push({
                                    shape: 'hull',
                                    parameters: [positions],
                                    position: { x: 0, y: 0, z: 0 },
                                    quaternion: { x: 0, y: 0, z: 0, w: 1 },
                                    friction: 0.7
                                })
                            }
                            
                            if(basicColliders.length > 0)
                            {
                                console.log(`[AltarArea] Created basic collider for ${o3d.name} as fallback`)
                                
                                // Obtener posición y rotación actuales del objeto (en espacio mundial)
                                o3d.updateWorldMatrix(true, true)
                                const worldPosition = new THREE.Vector3()
                                const worldQuaternion = new THREE.Quaternion()
                                o3d.getWorldPosition(worldPosition)
                                o3d.getWorldQuaternion(worldQuaternion)
                                
                                // Crear física estática (fixed) directamente
                                const physicalDescription = {
                                    type: 'fixed',
                                    position: worldPosition,
                                    rotation: worldQuaternion,
                                    friction: 0.7,
                                    colliders: basicColliders,
                                    category: 'object'
                                }
                                
                                // Crear el objeto físico
                                obj.physical = this.game.physics.getPhysical(physicalDescription)
                                
                                if(!obj.physical || !obj.physical.body)
                                {
                                    console.error(`[AltarArea] ERROR: Failed to create physics for ${o3d.name} even with basic collider`)
                                }
                                else
                                {
                                    console.log(`[AltarArea] Physics created for ${o3d.name} with basic collider, body position:`, obj.physical.body.translation())
                                    
                                    // Vincular física con objeto visual
                                    obj.physical.body.userData = { object: obj }
                                    if(obj.visual)
                                    {
                                        obj.visual.object3D.userData.object = obj
                                    }
                                    
                                    // SINCRONIZAR física con visual
                                    if(obj.visual && obj.physical && obj.physical.type === 'fixed')
                                    {
                                        const visualWorldPos = new THREE.Vector3()
                                        const visualWorldQuat = new THREE.Quaternion()
                                        obj.visual.object3D.getWorldPosition(visualWorldPos)
                                        obj.visual.object3D.getWorldQuaternion(visualWorldQuat)
                                        
                                        obj.physical.body.setTranslation(visualWorldPos, true)
                                        obj.physical.body.setRotation(visualWorldQuat, true)
                                        
                                        obj.visual.object3D.position.copy(obj.physical.body.translation())
                                        obj.visual.object3D.quaternion.copy(obj.physical.body.rotation())
                                    }
                                }
                            }
                        }
                        else
                        {
                            console.error(`[AltarArea] ERROR: ${o3d.name} has no geometry positions!`)
                        }
                    }
                    else
                    {
                        console.error(`[AltarArea] ERROR: ${o3d.name} is not a mesh and has no child meshes with valid geometry!`)
                    }
                }
                else if(colliders && colliders.length > 0)
                {
                    console.log(`[AltarArea] Adding physics to ${o3d.name} with ${colliders.length} colliders`)
                    
                    // Obtener posición y rotación actuales del objeto (en espacio mundial)
                    o3d.updateWorldMatrix(true, true)
                    const worldPosition = new THREE.Vector3()
                    const worldQuaternion = new THREE.Quaternion()
                    o3d.getWorldPosition(worldPosition)
                    o3d.getWorldQuaternion(worldQuaternion)
                    
                    console.log(`[AltarArea] ${o3d.name} world position:`, worldPosition)
                    console.log(`[AltarArea] ${o3d.name} local position:`, o3d.position)

                    // Crear física estática (fixed) directamente
                    const physicalDescription = {
                        type: 'fixed',
                        position: worldPosition,
                        rotation: worldQuaternion,
                        friction: 0.7,
                        colliders: colliders,
                        category: 'object'
                    }

                    // Crear el objeto físico
                    obj.physical = this.game.physics.getPhysical(physicalDescription)
                    
                    if(!obj.physical || !obj.physical.body)
                    {
                        console.error(`[AltarArea] ERROR: Failed to create physics for ${o3d.name}`)
                        // No agregar física, continuar con el siguiente objeto
                    }
                    else
                    {
                        console.log(`[AltarArea] Physics created for ${o3d.name}, body position:`, obj.physical.body.translation())
                        
                        // Vincular física con objeto visual
                        obj.physical.body.userData = { object: obj }
                        if(obj.visual)
                        {
                            obj.visual.object3D.userData.object = obj
                        }
                        
                            // SINCRONIZAR física con visual - Para objetos fixed, física sigue a visual
                            if(obj.visual && obj.physical && obj.physical.type === 'fixed')
                            {
                                // CRÍTICO: Para objetos fixed, asegurar que el body esté ACTIVO
                                if(!obj.physical.body.isEnabled())
                                {
                                    console.log(`  - Enabling physics body for ${o3d.name}`)
                                    obj.physical.body.setEnabled(true)
                                }
                                
                                // Asegurar que el body NO esté durmiendo
                                if(obj.physical.body.isSleeping())
                                {
                                    console.log(`  - Waking up physics body for ${o3d.name}`)
                                    obj.physical.body.wakeUp()
                                }
                                
                                // Para objetos fixed, la física debe seguir la posición visual
                                const visualWorldPos = new THREE.Vector3()
                                const visualWorldQuat = new THREE.Quaternion()
                                obj.visual.object3D.getWorldPosition(visualWorldPos)
                                obj.visual.object3D.getWorldQuaternion(visualWorldQuat)
                                
                                // Sincronizar física con visual (física sigue a visual para objetos fixed)
                                obj.physical.body.setTranslation(visualWorldPos, true)
                                obj.physical.body.setRotation(visualWorldQuat, true)
                                
                                // IMPORTANTE: Para objetos fixed, el visual NO debe seguir a la física
                                // porque la física es estática. El visual mantiene su posición original.
                                
                                console.log(`[AltarArea] ✓ Physics synced for ${o3d.name}, enabled: ${obj.physical.body.isEnabled()}`)
                            }
                    }
                    
                    // NO agregar a hideable - queremos que la casa siempre sea visible
                    // Los objetos de la casa no deben ser ocultados por frustum culling
                    // if(obj.visual && obj.physical?.type === 'fixed')
                    // {
                    //     if(!this.objects.hideable.includes(obj.visual.object3D))
                    //     {
                    //         this.objects.hideable.push(obj.visual.object3D)
                    //     }
                    // }
                    
                    physicsAddedCount++
                }
            }
        })
        
        console.log(`[AltarArea] Final physics count: ${physicsAddedCount} house objects`)
    }

    setBeam()
    {
        const radius = 2.5
        this.height = 6
        this.beamAttenuation = uniform(2)

        // Cylinder
        const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, this.height, 32, 1, true)
        cylinderGeometry.translate(0, this.height * 0.5, 0)
        
        const cylinderMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })

        cylinderMaterial.outputNode = Fn(() =>
        {
            const baseUv = uv()

            // Noise
            const noiseUv = vec2(baseUv.x.mul(6).add(baseUv.y.mul(-2)), baseUv.y.mul(1).sub(this.game.ticker.elapsedScaledUniform.mul(0.2)))
            const noise = texture(this.game.noises.perlin, noiseUv).r
            noise.addAssign(baseUv.y.mul(this.beamAttenuation.add(1)))

            // Emissive
            const emissiveColor = this.color.mul(this.emissive)

            // Goo
            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color) // Fog

            // Mix
            // const gooMask = step(noise, 0.95)
            const gooMask = step(0.65, noise)
            const finalColor = mix(emissiveColor, gooColor, gooMask)

            // Discard
            noise.greaterThan(1).discard()
            
            return vec4(finalColor, 1)
        })()

        const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
        cylinder.position.copy(this.position)
        this.game.scene.add(cylinder)
        this.objects.hideable.push(cylinder)

        // Bottom
        const bottomGeometry = new THREE.PlaneGeometry(radius * 2, radius * 2, 1, 1)

        const satanStarTexture = this.game.resources.satanStarTexture
        satanStarTexture.minFilter = THREE.NearestFilter
        satanStarTexture.magFilter = THREE.NearestFilter
        satanStarTexture.generateMipmaps = false
        
        const bottomMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true })
        bottomMaterial.outputNode = Fn(() =>
        {
            const newUv = uv().sub(0.5).mul(1.7).add(0.5)
            const satanStar = texture(satanStarTexture, newUv).r

            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color) // Fog

            const emissiveColor = this.color.mul(this.emissive)
            
            const finalColor = mix(gooColor, emissiveColor, satanStar)

            return vec4(finalColor, 1)
        })()

        const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial)
        bottom.position.copy(this.position)
        bottom.rotation.x = - Math.PI * 0.5
        this.game.scene.add(bottom)
        this.objects.hideable.push(bottom)

        this.animateBeam = () =>
        {
            gsap.to(
                this.beamAttenuation,
                { value: 0, ease: 'power2.out', duration: 0.4, onComplete: () =>
                {
                    gsap.to(
                        this.beamAttenuation,
                        { value: 2, ease: 'power2.in', duration: 3 },
                    )
                } },
            )
        }
    }

    setBeamParticles()
    {
        const count = 150

        // Uniforms
        const progress = uniform(0)
        
        // Attributes
        const positionArray = new Float32Array(count * 3)
        const scaleArray = new Float32Array(count)
        const randomArray = new Float32Array(count)
        
        for(let i = 0; i < count; i++)
        {
            const i3 = i * 3

            const spherical = new THREE.Spherical(
                (1 - Math.pow(1 - Math.random(), 2)) * 5,
                Math.random() * Math.PI * 0.4,
                Math.random() * Math.PI * 2
            )
            const position = new THREE.Vector3().setFromSpherical(spherical)
            positionArray[i3 + 0] = position.x
            positionArray[i3 + 1] = position.y
            positionArray[i3 + 2] = position.z

            scaleArray[i] = Math.random()
            randomArray[i] = Math.random()
        }
        const position = instancedArray(positionArray, 'vec3').toAttribute()
        const scale = instancedArray(scaleArray, 'float').toAttribute()
        const random = instancedArray(randomArray, 'float').toAttribute()

        // Material
        const particlesMaterial = new THREE.SpriteNodeMaterial()
        particlesMaterial.outputNode = Fn(() =>
        {
            const distanceToCenter = uv().sub(0.5).length()
            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color) // Fog
            const emissiveColor = this.color.mul(this.emissive)
            const finalColor = mix(gooColor, emissiveColor, step(distanceToCenter, 0.35))

            // Discard
            distanceToCenter.greaterThan(0.5).discard()

            return vec4(finalColor, 1)
        })()
        particlesMaterial.positionNode = Fn(() =>
        {
            const localProgress = progress.remapClamp(0, 0.5, 1, 0).pow(6).oneMinus()
            
            const finalPosition = position.toVar().mulAssign(localProgress)
            finalPosition.y.addAssign(progress.mul(random))

            return finalPosition
        })()
        particlesMaterial.scaleNode = Fn(() =>
        {
            const finalScale = smoothstep(1, 0.3, progress).mul(scale)
            return finalScale
        })()
        
        // Geometry
        const particlesGeometry = new THREE.PlaneGeometry(0.2, 0.2)

        // Mesh
        const particles = new THREE.Mesh(particlesGeometry, particlesMaterial)
        particles.count = count
        particles.position.copy(this.position)
        particles.position.y -= 0.1
        this.game.scene.add(particles)
        this.objects.hideable.push(particles)

        this.animateBeamParticles = () =>
        {
            gsap.fromTo(
                progress,
                { value: 0 },
                { value: 1, ease: 'linear', duration: 3 },
            )
        }
    }

    setGlyphs()
    {
        const count = 40

        const positions = new Float32Array(count * 3)
        const speeds = new Float32Array(count)
        
        for(let i = 0; i < count; i++)
        {
            const angle = Math.PI * 2 * Math.random()
            const elevation = Math.random() * 5
            const radius = Math.random() * 8
            positions[i * 3 + 0] = Math.sin(angle) * radius
            positions[i * 3 + 1] = elevation
            positions[i * 3 + 2] = Math.cos(angle) * radius
            
            speeds[i] = 0.2 + Math.random() * 0.8
        }

        const positionAttribute = instancedArray(positions, 'vec3').toAttribute()
        const speedAttribute = instancedArray(speeds, 'float').toAttribute()

        const material = new THREE.SpriteNodeMaterial({ transparent: true })
        
        const progressVarying = varying(float(0))

        material.positionNode = Fn(() =>
        {
            progressVarying.assign(this.game.ticker.elapsedScaledUniform.mul(0.05).add(float(instanceIndex).div(count)).fract())

            const newPosition = positionAttribute.toVar()
            newPosition.y.addAssign(progressVarying.mul(speedAttribute))
            return newPosition
        })()

        material.scaleNode = Fn(() =>
        {
            const scale = min(
                progressVarying.remapClamp(0, 0.1, 0, 1),
                progressVarying.remapClamp(0.7, 0.8, 1, 0),
                1
            )
            return scale.mul(0.2)
        })()

        const emissiveAMaterial = this.game.materials.getFromName('emissiveBlueRadialGradient')
        const emissiveBMaterial = this.game.materials.getFromName('emissiveOrangeRadialGradient')

        material.outputNode = Fn(() =>
        {
            // Glyph
            const glyphUv = uv().toVar()
            glyphUv.x.addAssign(instanceIndex)
            glyphUv.x.divAssign(32)
            const glyph = texture(this.game.resources.achievementsGlyphsTexture, glyphUv).r
            glyph.lessThan(0.5).discard()

            // Emissive
            const emissiveOutput = mix(
                emissiveBMaterial.outputNode,
                emissiveAMaterial.outputNode,
                float(instanceIndex).div(count).step(this.progressUniform)
            )

            return emissiveOutput
        })()

        const geometry = new THREE.PlaneGeometry(1, 1)

        const mesh = new THREE.Mesh(geometry, material)
        mesh.renderOrder = 3
        mesh.position.x = this.position.x
        mesh.position.y = 0
        mesh.position.z = this.position.z
        mesh.count = count
        this.game.scene.add(mesh)
        this.objects.hideable.push(mesh)

        let frustumNeedsUpdate = true
        this.events.on('frustumIn', () =>
        {
            if(frustumNeedsUpdate)
            {
                this.game.ticker.wait(2, () =>
                {
                    mesh.geometry.boundingSphere.center.y = 2
                    mesh.geometry.boundingSphere.radius = 5
                })
                frustumNeedsUpdate = false
            }
        })
    }

    setCounter()
    {
        const size = 3

        // Canvas
        const ratio = 1 / 4
        this.width = 256
        this.height = this.width * ratio
        this.font = `700 ${this.height}px "Amatic SC"`
        
        const canvas = document.createElement('canvas')
        canvas.width = this.width
        canvas.height = this.height

        this.textTexture = new THREE.Texture(canvas)
        this.textTexture.colorSpace = THREE.SRGBColorSpace
        this.textTexture.minFilter = THREE.NearestFilter
        this.textTexture.magFilter = THREE.NearestFilter
        this.textTexture.generateMipmaps = false

        this.context = canvas.getContext('2d')
        this.context.font = this.font

        // Geometry
        const geometry = new THREE.PlaneGeometry(size, size * ratio, 1, 1)

        // Material
        const material = new THREE.MeshBasicNodeMaterial({ transparent: true })
        material.outputNode = Fn(() =>
        {
            const textData = texture(this.textTexture, uv())
            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color) // Fog
            const emissiveColor = this.color.mul(this.emissive)
            const finalColor = mix(gooColor, emissiveColor, textData.g)

            // Discard
            textData.r.add(textData.g).lessThan(0.5).discard()

            return vec4(finalColor, 1)
        })()

        // Mesh
        this.mesh = new THREE.Mesh(geometry, material)
        this.references.items.get('counter')[0].add(this.mesh)
    }

    setDeathZone()
    {
        const position = this.position.clone()
        position.y -= 1.25
        const zone = this.game.zones.create('sphere', position, 2.5)

        zone.events.on(
            'enter',
            () =>
            {
                this.animateBeam()
                this.animateBeamParticles()
                this.data.insert()
                this.updateText(this.value + 1)
                this.game.player.die()
                this.sounds.deathBell2.play()
                gsap.delayedCall(2.2, () =>
                {
                    this.sounds.deathBell1.play()
                })
                this.game.achievements.setProgress('sacrifice', 1)
            }
        )
    }

    setData()
    {
        this.data = {}
        
        this.data.insert = () =>
        {
            this.game.server.send({
                type: 'cataclysmInsert'
            })
        }

        // Server message event
        this.game.server.events.on('message', (data) =>
        {
            // Init and insert
            if(data.type === 'init' || data.type === 'cataclysmUpdate')
            {
                this.updateText(data.cataclysmCount)
                this.progressUniform.value = data.cataclysmProgress
            }
        })

        // Init message already received
        if(this.game.server.initData)
        {
            this.updateText(this.game.server.initData.cataclysmCount)
            this.progressUniform.value = this.game.server.initData.cataclysmProgress
        }
    }

    updateText(value)
    {
        let formatedValue = null

        // Displaying number value
        if(typeof value === 'number')
        {
            // Same value
            if(value === this.value)
                return
                
            this.value = value
            formatedValue = value.toLocaleString('en-US')
        }

        // Displaying text value
        else
        {
            formatedValue = value
        }

        this.context.font = this.font

        this.context.fillStyle = '#000000'
        this.context.fillRect(0, 0, this.width, this.height)

        this.context.font = this.font
        this.context.textAlign = 'center'
        this.context.textBaseline = 'middle'

        this.context.strokeStyle = '#ff0000'
        this.context.lineWidth = this.height * 0.15
        this.context.strokeText(formatedValue, this.width * 0.5, this.height * 0.55)

        this.context.fillStyle = '#00ff00'
        this.context.fillText(formatedValue, this.width * 0.5, this.height * 0.55)

        this.textTexture.needsUpdate = true

        gsap.to(
            this.mesh.scale,
            {
                x: 1.5,
                y: 1.5,
                duration: 0.3,
                overwrite: true,
                onComplete: () =>
                {
                    gsap.to(
                        this.mesh.scale,
                        {
                            x: 1,
                            y: 1,
                            duration: 2,
                            ease: 'elastic.out(1,0.3)',
                            overwrite: true
                        }
                    )
                }
            }
        )
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'altar')
        })
    }
}