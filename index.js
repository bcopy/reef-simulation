// Existing stationary-caustics shader (unchanged)
AFRAME.registerShader('stationary-caustics', {
  schema: {
    color: {type: 'color', is: 'uniform', default: '#0000ff'},
    timeMsec: {type: 'time', is: 'uniform'}
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform vec3 color;
    uniform float timeMsec;

    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      float time = timeMsec / 1000.0; // Convert from ms to seconds
      
      // Create stationary base pattern
      float baseNoise = snoise(vUv * 5.0);
      
      // Add subtle animation for shimmering effect
      float animNoise = snoise(vUv * 10.0 + vec2(sin(time * 0.3), cos(time * 0.3)) * 0.3);
      
      float combinedNoise = (baseNoise * 0.7 + animNoise * 0.3);
      
      float causticIntensity = smoothstep(-1.0, 1.0, combinedNoise);
      gl_FragColor = vec4(color * causticIntensity, causticIntensity * 0.7);
    }
  `
});

// New water surface shader
AFRAME.registerShader('water-surface', {
  schema: {
    color: {type: 'color', is: 'uniform', default: '#7AD7F0'},
    timeMsec: {type: 'time', is: 'uniform'}
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float timeMsec;
    varying vec2 vUv;

    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      float time = timeMsec / 1000.0;
      
      // Create wave effect
      float noise = snoise(vUv * 3.0 + vec2(time * 0.2, time * 0.1));
      
      // Add smaller ripples
      noise += snoise(vUv * 10.0 + vec2(time * -0.1, time * 0.3)) * 0.2;
      
      // Adjust color based on noise
      vec3 adjustedColor = color + vec3(noise * 0.1);
      
      // Add some transparency variation
      float alpha = 0.8 + noise * 0.2;
      
      gl_FragColor = vec4(adjustedColor, alpha);
    }
  `
});

AFRAME.registerComponent('bubbles', {
  schema: {
    count: {type: 'number', default: 100},
    color: {type: 'color', default: '#ffffff'},
    size: {type: 'number', default: 0.02},
    speed: {type: 'number', default: 0.1},
    opacity: {type: 'number', default: 0.5}  // New opacity parameter
  },

  init: function() {
    this.bubbles = [];
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      color: this.data.color,
      transparent: true,
      specular: new THREE.Color(0x1188ff),
      shininess: 100,
      reflectivity: 1,
      opacity: this.data.opacity  // Use the opacity from schema
    });

    for (let i = 0; i < this.data.count; i++) {
      const bubble = new THREE.Mesh(geometry, material);
      bubble.position.set(
        Math.random() * 10 - 5,
        Math.random() * 5 - 2.5,
        Math.random() * 10 - 5
      );
      bubble.scale.setScalar(this.data.size * (0.5 + Math.random()));
      this.el.object3D.add(bubble);
      this.bubbles.push(bubble);
    }
  },

  tick: function(time, deltaTime) {
    for (let bubble of this.bubbles) {
      bubble.position.y += this.data.speed * deltaTime / 1000;
      if (bubble.position.y > 3) {
        bubble.position.y = -2.5;
      }
      bubble.position.x += Math.sin(time * 0.001 + bubble.position.y) * 0.001;
      bubble.position.z += Math.cos(time * 0.0015 + bubble.position.y) * 0.001;
    }
  }
});

AFRAME.registerComponent('floating-camera', {
schema: {
  damping: { type: 'number', default: 0.1 },
  buoyancy: { type: 'number', default: 0.01 },
  maxTilt: { type: 'number', default: 5 }
},

init: function () {
  this.velocity = new THREE.Vector3();
  this.acceleration = new THREE.Vector3();
  this.originalPosition = new THREE.Vector3();
  this.el.object3D.getWorldPosition(this.originalPosition);
},

tick: function (time, deltaTime) {
  // if (!this.el.sceneEl.is('vr-mode')) {
    const cameraPosition = this.el.object3D.position;
    const cameraRotation = this.el.object3D.rotation;

    // Calculate movement
    const movement = cameraPosition.clone().sub(this.originalPosition);

    // Apply buoyancy
    this.acceleration.y = -movement.y * this.data.buoyancy;

    // Apply water resistance (damping)
    this.acceleration.sub(this.velocity.clone().multiplyScalar(this.data.damping));

    // Update velocity and position
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime / 1000));
    cameraPosition.add(this.velocity.clone().multiplyScalar(deltaTime / 1000));

    // Apply subtle tilt based on movement
    const tiltX = THREE.MathUtils.clamp(this.velocity.z * 2, -this.data.maxTilt, this.data.maxTilt);
    const tiltZ = THREE.MathUtils.clamp(-this.velocity.x * 2, -this.data.maxTilt, this.data.maxTilt);
    cameraRotation.x = THREE.MathUtils.degToRad(tiltX);
    cameraRotation.z = THREE.MathUtils.degToRad(tiltZ);

    // Reset acceleration
    this.acceleration.set(0, 0, 0);
  // }
}
});

AFRAME.registerComponent('simple-float', {
  schema: {
    amplitude: { type: 'number', default: 0.05 },
    speed: { type: 'number', default: 1 },
    horizontalDrift: { type: 'number', default: 0.02 },
    minHeight: { type: 'number', default: 0.5 },
    tiltAmount: { type: 'number', default: 2 }  // Maximum tilt in degrees
  },

  init: function() {
    this.targetPosition = new THREE.Vector3();
    this.initialY = this.el.object3D.position.y;
    this.tiltObject = new THREE.Object3D();
    this.el.object3D.add(this.tiltObject);
  },

  tick: function (time, deltaTime) {
    const camera = this.el.object3D;
    const { amplitude, speed, horizontalDrift, minHeight, tiltAmount } = this.data;

    // Calculate target position
    const floatY = Math.sin(time * 0.001 * speed) * amplitude;
    const driftX = Math.sin(time * 0.0007 * speed) * horizontalDrift;
    const driftZ = Math.cos(time * 0.0005 * speed) * horizontalDrift;

    this.targetPosition.set(
      camera.position.x + driftX,
      Math.max(this.initialY + floatY, this.initialY + minHeight),
      camera.position.z + driftZ
    );

    // Smoothly interpolate current position to target position
    camera.position.lerp(this.targetPosition, 0.02);

    // Apply tilt to the tilt object, not directly to the camera
    this.tiltObject.rotation.x = THREE.MathUtils.degToRad(Math.sin(time * 0.002 * speed) * tiltAmount);
    this.tiltObject.rotation.z = THREE.MathUtils.degToRad(Math.cos(time * 0.002 * speed) * tiltAmount);
  }
});


AFRAME.registerShader('radial-gradient', {
  schema: {
    color: {type: 'color', is: 'uniform', default: '#7AD7F0'},
    opacity: {type: 'number', is: 'uniform', default: 1.0},
    radius: {type: 'number', is: 'uniform', default: 10.0},
    falloff: {type: 'number', is: 'uniform', default: 0.5},
    texture: {type: 'map', is: 'uniform'}
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float opacity;
    uniform float radius;
    uniform float falloff;
    uniform sampler2D texture;
    varying vec2 vUv;
    void main() {
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(vUv, center);
      float alpha = 1.0 - smoothstep(radius * (1.0 - falloff), radius, dist * radius * 2.0);
      vec4 texColor = texture2D(texture, vUv);
      gl_FragColor = vec4(color * texColor.rgb, alpha * opacity * texColor.a);
    }
  `
});


AFRAME.registerComponent('surface-placer', {
  schema: {
    target: { type: 'selector' },
    position: { type: 'vec3' },
    normal: { type: 'vec3' }
  },

  init: function() {
    this.placeOnSurface();
  },

  update: function() {
    this.placeOnSurface();
  },

  placeOnSurface: function() {
    const targetEl = this.data.target;
    if (!targetEl) {
      console.warn('Target element not found');
      return;
    }

    // Get the world position of the target element
    const targetWorldPosition = new THREE.Vector3();
    targetEl.object3D.getWorldPosition(targetWorldPosition);

    // Calculate the world position of the placement point
    const placementWorldPosition = new THREE.Vector3(
      targetWorldPosition.x + this.data.position.x,
      targetWorldPosition.y + this.data.position.y,
      targetWorldPosition.z + this.data.position.z
    );

    // Set the position of this entity
    this.el.object3D.position.copy(placementWorldPosition);

    // Calculate the rotation based on the normal vector
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3(this.data.normal.x, this.data.normal.y, this.data.normal.z);
    normal.normalize();

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, normal);

    // Apply the rotation
    this.el.object3D.quaternion.copy(quaternion);
  }
});

AFRAME.registerComponent('custom-wasd-controls', {
  schema: {
    speed: { type: 'number', default: 5 }
  },

  init: function () {
    this.moveVector = new THREE.Vector3();
    this.keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false };

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
  },

  onKeyDown: function (event) {
    if (this.keys.hasOwnProperty(event.code)) {
      this.keys[event.code] = true;
    }
  },

  onKeyUp: function (event) {
    if (this.keys.hasOwnProperty(event.code)) {
      this.keys[event.code] = false;
    }
  },

  tick: function (time, deltaTime) {
    const secondsElapsed = deltaTime / 1000;
    const currentPosition = this.el.object3D.position;
    const currentRotation = this.el.object3D.rotation;

    this.moveVector.set(0, 0, 0);

    if (this.keys.KeyW) this.moveVector.z -= 1;
    if (this.keys.KeyS) this.moveVector.z += 1;
    if (this.keys.KeyA) this.moveVector.x -= 1;
    if (this.keys.KeyD) this.moveVector.x += 1;

    if (this.moveVector.length() > 0) {
      this.moveVector.normalize();
      this.moveVector.multiplyScalar(this.data.speed * secondsElapsed);

      // Rotate movement vector based on camera's Y rotation
      this.moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentRotation.y);

      currentPosition.add(this.moveVector);
    }
  },

  remove: function () {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
  }
});