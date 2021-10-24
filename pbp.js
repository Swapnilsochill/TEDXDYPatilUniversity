
    import {
        Scene,
        WebGLRenderer,
        PerspectiveCamera,
        Object3D,
        BoxBufferGeometry,
        BufferAttribute,
        MeshBasicMaterial,
        InstancedMesh,
        InstancedBufferAttribute,
        CanvasTexture
    } from 'https://unpkg.com/three@0.121.1/build/three.module.js';

    const rowCount = 20;
    const columnCount = 64;
    const layerCount = 2;
       
    const camera = new PerspectiveCamera( 60, innerWidth / innerHeight, 1, 1000 );
    camera.position.set( 0, 6, 6 );
    camera.lookAt( 0, 0, 1 );

    const scene = new Scene();

    const geom = new BoxBufferGeometry();
    const rowCol = [];

    for ( let i = 0; i < rowCount; i ++ ) {
        for ( let j = 0; j < layerCount; j ++ ) {
            for ( let k = 0; k < columnCount; k ++ ) {
                rowCol.push( i );
                rowCol.push( k );
                rowCol.push( j );
            }
        }
    }

    geom.setAttribute( 'rcl', new InstancedBufferAttribute( new Float32Array( rowCol ), 3 ) );

    const canvas = document.getElementById('myCanvas');
   
    
    const size = canvas.height = canvas.width = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    ctx.clearRect(3, 3, size-6, size-6);
    
    const map = new CanvasTexture(canvas);
    map.anisotropy = 4;
    const material = new MeshBasicMaterial({map});

    const time = {value: 0};
    
    material.onBeforeCompile = (shader) => {
        
        shader.uniforms.time = time;
        
        shader.vertexShader = shader.vertexShader
            .split('#include <common>').join(`

    uniform float time;
    attribute vec3 rcl;
    #include <common>
    varying vec3 col;
            `)
            .split('#include <project_vertex>').join(`
   
    const float columnCount = float(${columnCount});
    const float arc = 2.0 * 3.14159265359 / columnCount;
    const float oneStep = 0.283;

    float shift = 3.0 - fract(time)*oneStep;

    float radius = shift;
    float zShift = 0.0;
    int x = int(rcl.x);
    for (int i = 0; i < x; i++) {
        radius += radius * arc;
        zShift += radius * arc;
    }

    vec4 mvPosition = vec4( transformed, 1.0 );

    if (mvPosition.z > 0.0) {
        radius += radius * arc;
    }

    mvPosition.xz *= radius * arc;
    mvPosition.z += zShift + shift;

    float t = sin(rcl.y/5.3)*1.1
            + sin(rcl.y/1.3)*1.5
            + cos(rcl.y/1.7)*2.5;

    t = 2.0 - rcl.x + abs(t) + fract(time);
    t += rcl.z*abs(sin(rcl.y));
    t = max(t, 0.);
    mvPosition.y -= t*t*t + rcl.z;

    float angle = rcl.y * arc;
    float sn = sin(angle); 
    float cs = cos(angle);
    mvPosition.xz = mvPosition.xz * mat2(cs, -sn, sn, cs);
    
    mvPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * mvPosition;
    col.rgb += sin(t*5.);
        `);
        
        console.log(shader.fragmentShader)
        
        shader.fragmentShader = shader.fragmentShader
            .split('void main() {')
            .join(`
               varying vec3 col;
            void main() {
            `)
            .split('gl_FragColor = vec4( outgoingLight, diffuseColor.a );')
            .join(`
     gl_FragColor = vec4( outgoingLight, diffuseColor.a );
     
     gl_FragColor.rgb += col;
     
            `)
    }
 
    scene.add( new InstancedMesh( geom, material, rowCount*columnCount*layerCount ) );

    const renderer = new WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( devicePixelRatio );
    renderer.setSize( innerWidth, innerHeight );
    document.body.appendChild( renderer.domElement );

    addEventListener( 'resize', onWindowResize, false );

    animate(0);
    
    function onWindowResize() {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( innerWidth, innerHeight );
    }

    function animate(t) {
        time.value = t/1000;
        scene.rotation.y = -t/10000 ;
        renderer.render( scene, camera );
        requestAnimationFrame( animate );
    }

