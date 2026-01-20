import { Area } from './Area.js'
import * as THREE from 'three/webgpu'


// Minimal LandingArea used to debug whether `letters` references are being detected.
export class LandingArea extends Area {
  constructor(model) {
  super(model)
  this.setLetters()
  }

  setLetters()
  {
      // 1) Recolectar letras desde references o por nombre en el modelo
      let letters = []

      const refsLetters = this.references?.items?.get?.('letters')
      if(Array.isArray(refsLetters) && refsLetters.length)
      {
          letters = refsLetters
      }
      else
      {
          // Fallback: buscar en el modelo por nombre
          this.model.traverse((o) =>
          {
              if(!o) return
              const n = (o.name || '').toLowerCase()
              if(n === 'letters' || n.startsWith('letters.') || n.startsWith('letters_') || n.startsWith('letters-'))
                  letters.push(o)
          })
      }

      if(!letters.length)
      {
          console.warn('[LandingArea] No letters found (no "letters" ref and no letter-like objects in model)')
          return
      }

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

          // Convertir el centro del box al espacio local del objeto,
          // porque los colliders se definen en espacio local del body.
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
                  quaternion: new THREE.Quaternion(), // sin rotación extra
                  friction: 0.7
              }
          ]
      }

      // 2) Asegurar física y configurar colisiones/sonido
      for(const letter of letters)
      {
          if(!letter) continue

          // Caso A: ya existe objeto físico (el loader ya lo creó)
          const existingPhysical = letter.userData?.object?.physical
          if(existingPhysical && existingPhysical.colliders && existingPhysical.colliders[0])
          {
              const body = existingPhysical.body
              
              // Configurar eventos de colisión (igual que bricks)
              existingPhysical.colliders[0].setActiveEvents(this.game.RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
              existingPhysical.colliders[0].setContactForceEventThreshold(15)
              existingPhysical.onCollision = (force, position) =>
              {
                  this.game.audio.groups.get('hitBrick')?.playRandomNext(force, position)
              }
              
              // Ajustar propiedades físicas para que coincidan con bricks
              if(existingPhysical.type === 'dynamic' && body)
              {
                  // Verificar si tiene masa razonable (si es muy baja o muy alta, ajustarla)
                  const currentMass = body.mass()
                  if(currentMass < 0.05 || currentMass > 1.0)
                  {
                      // Ajustar masa en todos los colliders
                      for(const collider of existingPhysical.colliders)
                      {
                          collider.setMass(0.1 / existingPhysical.colliders.length)
                      }
                  }
                  
                  // Ajustar propiedades físicas para igualar bricks
                  for(const collider of existingPhysical.colliders)
                  {
                      collider.setFriction(0.7)
                      collider.setRestitution(0.15) // default como bricks
                  }
                  
                  // Ajustar damping a defaults (0.1 cada uno, como bricks)
                  body.setLinearDamping(0.1)
                  body.setAngularDamping(0.1)
                  
                  // Asegurar que está durmiendo (como bricks)
                  if(!body.isSleeping())
                  {
                      body.sleep()
                  }
                  
                  // Asegurar que puede dormirse después
                  if(typeof body.setCanSleep === 'function')
                  {
                      body.setCanSleep(true)
                  }
                  
                  // Agregar waterGravityMultiplier (igual que bricks)
                  existingPhysical.waterGravityMultiplier = -1
                  
                  // Prevenir reset automático para que las letras puedan moverse libremente
                  existingPhysical.preventReset = true
              }
              
              continue
          }

          // Caso B: no tiene física -> crearla con un cuboid collider
          // Guardar parent actual para reinsertar el modelo (si estaba en escena)
          const parent = letter.parent || this.game.scene

          // Si ya estaba en escena, lo removemos para que Objects.add lo maneje
          // (evita duplicados)
          letter.removeFromParent?.()

          const colliders = buildCuboidCollidersFromObject(letter)

          const object = this.game.objects.add(
              {
                  model: letter,
                  updateMaterials: false,
                  parent: parent,
              },
              {
                  type: 'dynamic',
                  position: letter.position.clone(),
                  rotation: letter.quaternion.clone(),
                  friction: 0.7,
                  mass: 0.1,
                  sleeping: true,
                  colliders: colliders,
                  waterGravityMultiplier: -1,
                  contactThreshold: 15,
                  preventReset: true,
                  onCollision: (force, position) =>
                  {
                      this.game.audio.groups.get('hitBrick')?.playRandomNext(force, position)
                  }
              }
          )

          // Por si quieres debug rápido:
          // console.log('[LandingArea] Added physics to letter:', letter.name, object)
      }
  }


}