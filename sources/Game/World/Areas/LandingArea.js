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
                  friction: 0.6,
                  restitution: 0.2
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
              existingPhysical.colliders[0].setActiveEvents(this.game.RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
              existingPhysical.colliders[0].setContactForceEventThreshold(5)
              existingPhysical.onCollision = (force, position) =>
              {
                  this.game.audio.groups.get('hitBrick')?.playRandomNext(force, position)
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
                  friction: 0.6,
                  restitution: 0.2,
                  linearDamping: 0.2,
                  angularDamping: 0.6,
                  sleeping: false,
                  enabled: true,
                  colliders: colliders,
                  contactThreshold: 5,
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