import * as THREE from 'three/webgpu'

const text = `
██████╗ ██████╗ ██╗   ██╗███╗   ██╗ ██████╗ ██╗███████╗                   
██╔══██╗██╔══██╗██║   ██║████╗  ██║██╔═══██╗╚═╝██╔════╝                   
██████╔╝██████╔╝██║   ██║██╔██╗ ██║██║   ██║   ███████╗                   
██╔══██╗██╔══██╗██║   ██║██║╚██╗██║██║   ██║   ╚════██║                   
██████╔╝██║  ██║╚██████╔╝██║ ╚████║╚██████╔╝   ███████║                   
╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝    ╚══════╝                   
                                                                       
██████╗  ██████╗ ██████╗ ████████╗███████╗ ██████╗ ██╗     ██╗ ██████╗ 
██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝██╔═══██╗██║     ██║██╔═══██╗
██████╔╝██║   ██║██████╔╝   ██║   █████╗  ██║   ██║██║     ██║██║   ██║
██╔═══╝ ██║   ██║██╔══██╗   ██║   ██╔══╝  ██║   ██║██║     ██║██║   ██║
██║     ╚██████╔╝██║  ██║   ██║   ██║     ╚██████╔╝███████╗██║╚██████╔╝
╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚══════╝╚═╝ ╚═════╝ 

╔═ Intro ═══════════════╗
║ ¡Gracias por visitar nuestro portafolio, desarrollador curioso!
║ Si quieres saber cómo construimos este proyecto en el Club de IA ULEAM, aquí tienes lo esencial.
╚═══════════════════════╝

╔═ Redes del Club ═════╗
║ Instagram      ⇒ https://www.instagram.com/club.ia.uleam?igsh=MXVzbjRoandxend4Yg==
║ WhatsApp       ⇒ https://chat.whatsapp.com/KdUtvDtJJvQ0VvD1CJWSOJ
║ Discord        ⇒ Disponible pronto
╚═══════════════════════╝

╔═ Debug ═══════════════╗
║ Puedes acceder al modo debug agregando #debug al final de la URL y recargando.
║ Presiona [V] para alternar la cámara libre.
╚═══════════════════════╝

╔═ Three.js ════════════╗
║ Three.js es la librería que uso para renderizar este mundo 3D (versión: ${THREE.REVISION})
║ https://threejs.org/
║ Fue creado por mr.doob (https://x.com/mrdoob, https://github.com/mrdoob),
║ seguido por cientos de desarrolladores increíbles,
║ uno de los cuales es Sunag (https://x.com/sea3dformat, https://github.com/sunag) quien agregó TSL,
║ permitiendo el uso tanto de WebGL como de WebGPU, haciendo posible este portafolio.
╚═══════════════════════╝

╔═ Viaje Three.js ════╗
║ Si quieres aprender Three.js, este curso enorme te cubre de inicio a fin.
║ https://threejs-journey.com/
║ Contiene todo lo que necesitas para crear experiencias geniales con Three.js (y más).
╚═══════════════════════╝

╔═ Devlogs ═════════════╗
║ Publicamos devlogs para compartir avances y experimentos del Club de IA ULEAM.
║ Pronto añadiremos el enlace al canal oficial; estate atento dentro del juego.
╚═══════════════════════╝

╔═ Código fuente ═══════╗
║ El código del Club de IA ULEAM estará disponible en nuestro repositorio oficial.
║ El servidor no se incluye por seguridad, pero la experiencia funciona en local.
╚═══════════════════════╝

╔═ Musics ══════════════╗
║ The music you hear was made especially for this portfolio by the awesome Kounine (Linktree).
║ https://linktr.ee/Kounine
║ They are now under CC0 license, meaning you can do whatever you want with them!
║ Descárgalas desde /static/sounds/musics/
╚═══════════════════════╝

╔═ Some more links ═════╗
║ Rapier (Physics library)  ⇒ https://rapier.rs/
║ Howler.js (Audio library) ⇒ https://howlerjs.com/
║ Amatic SC (Fonts)         ⇒ https://fonts.google.com/specimen/Amatic+SC
║ Nunito (Fonts).           ⇒ https://fonts.google.com/specimen/Nunito?query=Nunito
╚═══════════════════════╝
`
let finalText = ''
let finalStyles = []
const stylesSet = {
    letter: 'color: #ffffff; font: 400 1em monospace;',
    pipe: 'color: #D66FFF; font: 400 1em monospace;',
}
let currentStyle = null
for(let i = 0; i < text.length; i++)
{
    const char = text[i]

    const style = char.match(/[╔║═╗╚╝╔╝]/) ? 'pipe' : 'letter'
    if(style !== currentStyle)
    {
        currentStyle = style
        finalText += '%c'

        finalStyles.push(stylesSet[currentStyle])
    }
    finalText += char
}

export default [finalText, ...finalStyles]