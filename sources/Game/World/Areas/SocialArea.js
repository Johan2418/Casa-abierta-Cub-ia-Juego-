import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import socialData from '../../../data/social.js'
import { InstancedGroup } from '../../InstancedGroup.js'
import { Area } from './Area.js'

export class SocialArea extends Area
{
    constructor(model)
    {
        super(model)

        this.center = this.references.items.get('center')[0].position

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '👨‍🦲 Social',
                expanded: false,
            })
        }

        // Temporalmente deshabilitado: se implementará en una sola estatua más adelante
        // this.setLinks()
        this.setFans()
        this.setOnlyFans()
        this.setStatue()
        this.setNewStatues()
        this.setAchievement()
    }

    setLinks()
    {
        const radius = 6
        let i = 0

        for(const link of socialData)
        {
            const angle = i * Math.PI / (socialData.length - 1)
            const position = this.center.clone()
            position.x += Math.cos(angle) * radius
            position.y = 1
            position.z -= Math.sin(angle) * radius

            this.interactivePoint = this.game.interactivePoints.create(
                position,
                link.name,
                link.align === 'left' ? InteractivePoints.ALIGN_LEFT : InteractivePoints.ALIGN_RIGHT,
                InteractivePoints.STATE_CONCEALED,
                () =>
                {
                    if(link.url)
                        window.open(link.url, '_blank')
                    else(link.modal)
                        this.game.modals.open(link.modal)
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.addItems(['interact'])
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.removeItems(['interact'])
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.removeItems(['interact'])
                }
            )
            
            i++
        }
    }

    setFans()
    {
        const baseFan = this.references.items.get('fan')[0]
        baseFan.castShadow = true
        baseFan.receiveShadow = true

        baseFan.position.set(0, 0, 0)

        // Update materials 
        this.game.materials.updateObject(baseFan)

        baseFan.removeFromParent()
        
        this.fans = {}
        this.fans.spawnerPosition = this.references.items.get('onlyFans')[0].position
        this.fans.count = 30
        this.fans.visibleCount = 0
        this.fans.currentIndex = 0
        this.fans.mass = 0.02
        this.fans.objects = []

        const references = []

        for(let i = 0; i < this.fans.count; i++)
        {
            // Reference
            const reference = new THREE.Object3D()

            reference.position.copy(this.fans.spawnerPosition)
            reference.position.y += 99
            reference.needsUpdate = true
            references.push(reference)
            
            // Object
            const object = this.game.objects.add(
                {
                    model: reference,
                    updateMaterials: false,
                    castShadow: false,
                    receiveShadow: false,
                    parent: null,
                },
                {
                    type: 'dynamic',
                    position: reference.position,
                    rotation: reference.quaternion,
                    friction: 0.7,
                    mass: this.fans.mass,
                    sleeping: true,
                    enabled: false,
                    colliders: [ { shape: 'cuboid', parameters: [ 0.45, 0.65, 0.45 ], category: 'object' } ],
                    waterGravityMultiplier: - 1
                },
            )

            this.fans.objects.push(object)
        }

        this.fans.instancedGroup = new InstancedGroup(references, baseFan)

        this.fans.pop = () =>
        {
            const object = this.fans.objects[this.fans.currentIndex]

            const spawnPosition = this.fans.spawnerPosition.clone()
            spawnPosition.x += (Math.random() - 0.5) * 4
            spawnPosition.y += 4 * Math.random()
            spawnPosition.z += (Math.random() - 0.5) * 4
            object.physical.body.setTranslation(spawnPosition)
            object.physical.body.setEnabled(true)
            object.physical.body.setLinvel({ x: 0, y: 0, z: 0 })
            object.physical.body.setAngvel({ x: 0, y: 0, z: 0 })
            object.physical.body.wakeUp()
            // this.game.ticker.wait(1, () =>
            // {
            //     object.physical.body.applyImpulse({
            //         x: (Math.random() - 0.5) * this.fans.mass * 2,
            //         y: Math.random() * this.fans.mass * 3,
            //         z: this.fans.mass * 7
            //     }, true)
            //     object.physical.body.applyTorqueImpulse({ x: 0, y: 0, z: 0 }, true)
            // })

            this.fans.currentIndex = (this.fans.currentIndex + 1) % this.fans.count

            this.fans.visibleCount = Math.min(this.fans.visibleCount + 1, this.fans.count)

            // Sound
            this.game.audio.groups.get('click').play(true)

            // Achievement
            this.game.achievements.setProgress('fan', 1)
        }
    }

    setOnlyFans()
    {
        const interactiveArea = this.game.interactivePoints.create(
            this.references.items.get('onlyFans')[0].position,
            'OnlyFans',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.fans.pop()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )
    }

    setStatue()
    {
        this.statue = {}
        
        // Buscar la nueva referencia: refStatuePhysicalDynamic se normaliza a 'statuephysicaldynamic'
        const statueRef = this.references.items.get('statuephysicaldynamic')
        
        if(!statueRef || !statueRef[0])
        {
            console.warn('[SocialArea] No se encontró la referencia refStatuePhysicalDynamic')
            this.statue.body = null
            this.statue.down = false
            return
        }
        
        const statueObject = statueRef[0]
        
        // Verificar que tiene física
        if(!statueObject.userData || !statueObject.userData.object || !statueObject.userData.object.physical || !statueObject.userData.object.physical.body)
        {
            console.warn('[SocialArea] La referencia refStatuePhysicalDynamic no tiene física configurada')
            this.statue.body = null
            this.statue.down = false
            return
        }
        
        this.statue.body = statueObject.userData.object.physical.body
        this.statue.down = false
    }

    setNewStatues()
    {
        // Lista de nombres de las nuevas estatuas (en minúsculas para comparación)
        const newStatueNames = [
            'instagram',
            'kaneki',
            'link',
            'mario',
            'master_chief',
            'masterchief',
            'whatsapp',
            'goku',
            'caballerito',
            'boyphysicaldynamic',
            'baguiraphysicaldynamic',
            'aoi_todo',
            'aoitodo'
        ]

        // Helper: construir un collider cuboid desde el bounding box del objeto
        const buildCuboidCollidersFromObject = (object3D) =>
        {
            // Necesitamos world matrices actualizadas para un Box3 correcto
            object3D.updateWorldMatrix(true, true)

            const boxWorld = new THREE.Box3().setFromObject(object3D)
            const sizeWorld = new THREE.Vector3()
            const centerWorld = new THREE.Vector3()
            boxWorld.getSize(sizeWorld)
            boxWorld.getCenter(centerWorld)

            // Convertir el centro del box al espacio local del objeto
            const invWorld = new THREE.Matrix4().copy(object3D.matrixWorld).invert()
            const centerLocal = centerWorld.clone().applyMatrix4(invWorld)

            // Evitar colliders degenerados
            const minSize = 0.01
            sizeWorld.x = Math.max(sizeWorld.x, minSize)
            sizeWorld.y = Math.max(sizeWorld.y, minSize)
            sizeWorld.z = Math.max(sizeWorld.z, minSize)

            return [
                {
                    shape: 'cuboid',
                    // half extents
                    parameters: [ sizeWorld.x * 0.5, sizeWorld.y * 0.5, sizeWorld.z * 0.5 ],
                    position: centerLocal,
                    quaternion: new THREE.Quaternion(),
                    friction: 0.7,
                    restitution: 0.15
                }
            ]
        }

        // Primero, buscar objetos que no se cargaron automáticamente en el modelo
        const foundInModel = []
        this.model.traverse((child) =>
        {
            if(!child || child === this.model)
                return

            const childName = child.name.toLowerCase().replace(/[^a-z0-9]/g, '')
            
            // Verificar si es una de las nuevas estatuas
            const isNewStatue = newStatueNames.some(name => 
                childName === name || 
                childName.includes(name) ||
                name.includes(childName)
            )

            if(isNewStatue && (child.isMesh || child.children.length > 0))
            {
                // Verificar si ya está en objects.items
                const alreadyLoaded = this.objects.items.some(obj => 
                    obj.visual && 
                    (obj.visual.object3D === child || obj.visual.object3D.name === child.name)
                )

                if(!alreadyLoaded)
                {
                    foundInModel.push(child)
                }
            }
        })

        // Cargar objetos que no se cargaron automáticamente
        for(const child of foundInModel)
        {
            console.log(`[SocialArea] Cargando estatua desde modelo: ${child.name}`)
            
            try
            {
                const object = this.game.objects.addFromModel(
                    child,
                    {},
                    {
                        position: child.position.clone().add(this.model.position),
                        rotation: child.quaternion.clone(),
                        sleeping: true
                    }
                )
                
                if(object)
                {
                    this.objects.items.push(object)
                    console.log(`[SocialArea] ✓ Estatua cargada: ${child.name}`)
                }
            }
            catch(error)
            {
                console.error(`[SocialArea] ⚠️ Error al cargar estatua ${child.name}:`, error)
            }
        }

        // Buscar las nuevas estatuas en los objetos cargados
        for(const object of this.objects.items)
        {
            if(!object.visual || !object.visual.object3D)
                continue

            const objectName = object.visual.object3D.name
            const objectNameLower = objectName.toLowerCase().replace(/[^a-z0-9]/g, '')

            // Verificar si es una de las nuevas estatuas (comparación más flexible)
            const isNewStatue = newStatueNames.some(name => 
                objectNameLower === name || 
                objectNameLower.includes(name) ||
                name.includes(objectNameLower)
            )

            if(!isNewStatue)
                continue

            console.log(`[SocialArea] Procesando estatua: ${objectName}`)

            // Si ya tiene física, verificar que sea dinámica
            if(object.physical && object.physical.body)
            {
                // Ya tiene física, verificar que sea dinámica
                if(object.physical.type === 'dynamic')
                {
                    // Asegurar que está configurada correctamente
                    object.physical.body.setLinearDamping(0.1)
                    object.physical.body.setAngularDamping(0.1)
                    // Nota: setCanSleep solo existe en RigidBodyDesc, no en RigidBody ya creado
                    // El canSleep se configura al crear el body, no se puede cambiar después
                    
                    // Configurar colliders si existen
                    if(object.physical.colliders && object.physical.colliders.length > 0)
                    {
                        for(const collider of object.physical.colliders)
                        {
                            collider.setFriction(0.7)
                            collider.setRestitution(0.15)
                        }
                    }
                    
                    continue
                }
                else
                {
                    // Tiene física pero no es dinámica, remover y recrear
                    console.log(`[SocialArea] Estatua ${objectName} tiene física pero no es dinámica. Recreando...`)
                    this.game.physics.world.removeRigidBody(object.physical.body)
                    object.physical = null
                }
            }

            // No tiene física o la removimos, crear física dinámica
            const object3D = object.visual.object3D
            
            // Asegurar que el objeto tiene geometría válida
            let hasGeometry = false
            object3D.traverse((child) =>
            {
                if(child.isMesh && child.geometry)
                {
                    hasGeometry = true
                }
            })

            if(!hasGeometry)
            {
                console.warn(`[SocialArea] ⚠️ Estatua ${objectName} no tiene geometría válida`)
                continue
            }

            const colliders = buildCuboidCollidersFromObject(object3D)

            if(colliders && colliders.length > 0)
            {
                // Calcular posición y rotación mundiales
                object3D.updateWorldMatrix(true, false)
                const worldPosition = new THREE.Vector3()
                const worldQuaternion = new THREE.Quaternion()
                object3D.matrixWorld.decompose(worldPosition, worldQuaternion, new THREE.Vector3())

                const physicalDescription = {
                    type: 'dynamic',
                    position: worldPosition,
                    rotation: worldQuaternion,
                    friction: 0.7,
                    mass: 0.1,
                    sleeping: true,
                    canSleep: true, // Configurar canSleep en la descripción (antes de crear el body)
                    colliders: colliders,
                    category: 'object',
                    waterGravityMultiplier: -1,
                    linearDamping: 0.1,
                    angularDamping: 0.1
                }

                object.physical = this.game.physics.getPhysical(physicalDescription)

                if(object.physical && object.physical.body)
                {
                    // Vincular el objeto físico con el visual
                    object3D.userData.object = object
                    
                    // Asegurar que el body está habilitado
                    // Nota: canSleep se configura en la descripción, no se puede cambiar después
                    object.physical.body.setEnabled(true)
                    
                    console.log(`[SocialArea] ✓ Física dinámica aplicada a estatua: ${objectName}`)
                }
                else
                {
                    console.warn(`[SocialArea] ⚠️ No se pudo crear física para estatua: ${objectName}`)
                }
            }
            else
            {
                console.warn(`[SocialArea] ⚠️ No se pudieron crear colliders para estatua: ${objectName}`)
            }
        }

        // Log final de todas las estatuas encontradas
        console.log(`[SocialArea] Total de objetos en items: ${this.objects.items.length}`)
        const statueObjects = this.objects.items.filter(obj => 
            obj.visual && 
            newStatueNames.some(name => 
                obj.visual.object3D.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(name) ||
                name.includes(obj.visual.object3D.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
            )
        )
        console.log(`[SocialArea] Estatuas encontradas: ${statueObjects.length}`)
        statueObjects.forEach(obj => {
            const hasPhysics = obj.physical && obj.physical.body ? '✓' : '✗'
            console.log(`[SocialArea]   ${hasPhysics} ${obj.visual.object3D.name} - Física: ${hasPhysics}`)
        })
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'social')
        })
    }

    update()
    {
        if(this.fans.visibleCount)
        {
            let allFansSleeping = true
            for(const fan of this.fans.objects)
                allFansSleeping = allFansSleeping && fan.physical.body.isSleeping()

            if(!allFansSleeping)
                this.fans.instancedGroup.updateBoundings()
        }
    
        // Verificar que la estatua existe y tiene física antes de verificar su estado
        if(this.statue.body && !this.statue.down && !this.statue.body.isSleeping())
        {
            const statueUp = new THREE.Vector3(0, 1, 0)
            statueUp.applyQuaternion(this.statue.body.rotation())
            if(statueUp.y < 0.25)
            {
                this.statue.down = true
                this.game.achievements.setProgress('statueDown', 1)
            }
        }

        for(const object of this.fans.objects)
        {
            if(!object.physical.body.isSleeping() && object.physical.body.isEnabled())
                object.visual.object3D.needsUpdate = true
        }
    }
}