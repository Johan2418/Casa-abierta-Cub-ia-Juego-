import * as THREE from 'three/webgpu'

export class References
{
    constructor(model)
    {
        this.items = new Map()

        if(model)
            this.parse(model)
        // Wrap Map#get to provide safe dummy references when missing
        this._ensureSafeGet()
    }

    parse(object)
    {
        object.traverse(_child =>
        {
            const name = _child.name

            // Names can come in different flavours from exported GLBs.
            // Accept patterns like:
            // - refMyName1
            // - referenceMyName01
            // - myName.001
            // - myName_01
            // This regex makes the `ref`/`reference` prefix optional and allows separators before trailing digits.
            const matches = name.match(/^(?:ref(?:erence)?)?([^0-9._-]+)(?:[._-]?([0-9]+))?$/i)
            if(matches)
            {
                // Extract name without prefix/suffix and normalize first char to lowercase
                const referenceName = matches[1].charAt(0).toLowerCase() + matches[1].slice(1)

                // Create / save in array
                if(!this.items.has(referenceName))
                    this.items.set(referenceName, [_child])
                else
                    this.items.get(referenceName).push(_child)
            }
        })
    }

    getStartingWith(searched)
    {
        const items = new Map()

        this.items.forEach((value, name) =>
        {
            if(name.startsWith(searched))
            {
                // Strip name from searched value
                let stripName = name.replace(new RegExp(`^${searched}(.+)$`), '$1')
                stripName = stripName.charAt(0).toLowerCase() + stripName.slice(1)

                items.set(stripName, value)
            }
        })

        return items
    }

    // Ensure callers using `this.items.get(name)[0]` don't crash when a reference is missing.
    // We override the Map#get behavior to return a safe dummy Object3D array when the key is absent.
    _ensureSafeGet()
    {
        const self = this

        const createDummy = () =>
        {
            // Use a Mesh so callers expecting geometry/attributes work
            const geometry = new THREE.BufferGeometry()
            // Provide at least two points (6 floats) so code reading position.array[0..5] is safe
            const positions = new Float32Array([0,0,0, 0,0,1])
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

            const material = new THREE.MeshBasicMaterial({ visible: false })
            const d = new THREE.Mesh(geometry, material)
            d.position.set(0, 0, 0)
            d.quaternion.set(0, 0, 0, 1)
            d.visible = false
            d.userData = { object: { physical: { body: {
                // Minimal stubs used across the codebase
                translation: () => ({ x: 0, y: 0, z: 0 }),
                setTranslation: () => {},
                setRotation: () => {},
                resetForces: () => {},
                resetTorques: () => {},
                setLinvel: () => {},
                setAngvel: () => {},
                sleep: () => {},
                isSleeping: () => true,
                setNextKinematicTranslation: () => {},
                // collider fallback
                collider: () => ({ setRestitution: () => {}, setFriction: () => {}, setEnabled: () => {} })
            } } } }
            return d
        }

        // Only wrap once
        if(this._safeGetWrapped) return
        const originalGet = this.items.get.bind(this.items)
        this.items.get = (key) =>
        {
            const v = originalGet(key)
            if(v === undefined || v === null || v.length === 0)
                return [ createDummy() ]
            return v
        }
        this._safeGetWrapped = true
    }
}