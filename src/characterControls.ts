import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const W = 'z'
const ArrowUp = 'arrowup'
const A = 'q'
const ArrowDown = 'arrowdown'
const S = 's'
const ArrowLeft = 'arrowleft'
const D = 'd'
const ArrowRight = 'arrowright'
const SHIFT = 'shift'
const SPACE = ' '
const DIRECTIONS = [W, A, S, D, ArrowDown, ArrowUp, ArrowLeft, ArrowRight]
const ANIMATIONPLAYONCE = ['Yes', 'No', 'Wave', 'Punch', 'ThumbsUp'];

export class CharacterControls {

    model: THREE.Group
    mixer: THREE.AnimationMixer
    animationsMap: Map<string, THREE.AnimationAction> = new Map() // Walk, Run, Idle
    orbitControl: OrbitControls
    camera: THREE.Camera

    // state
    toggleRun: boolean = true
    playingOnce: boolean = false
    currentAction: string
    
    // temporary data
    walkDirection = new THREE.Vector3()
    rotateAngle = new THREE.Vector3(0, 1, 0)
    rotateQuarternion: THREE.Quaternion = new THREE.Quaternion()
    cameraTarget = new THREE.Vector3()
    raycaster = new THREE.Raycaster()
    objects: THREE.Object3D[] = []
    jumpHigh: number = 0
    
    // constants
    fadeDuration: number = 0.2
    runVelocity = 20
    walkVelocity = 10
    jumpVelocity = 5
    jumpHeight = 8

    constructor(model: THREE.Group,
        mixer: THREE.AnimationMixer, animationsMap: Map<string, THREE.AnimationAction>,
        orbitControl: OrbitControls, camera: THREE.Camera,
        currentAction: string, objects: THREE.Object3D[]) {
        this.model = model
        this.mixer = mixer
        this.animationsMap = animationsMap
        this.currentAction = currentAction
        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play()
            }
        })
        this.orbitControl = orbitControl
        this.camera = camera
        this.objects = objects
        this.raycaster.set(new THREE.Vector3(), new THREE.Vector3( 0, 0.5, 0 ))
        this.raycaster.near = 0
        this.raycaster.far = 2
        this.updateCameraTarget(0, 0, 0)
    }

    public switchRunToggle() {
        this.toggleRun = !this.toggleRun
    }

    private switchPlayingOnce() {
      this.playingOnce = false
    }

    public update(delta: number, keysPressed: any) {
        const directionPressed = DIRECTIONS.some(key => keysPressed[key] == true)
        let moveY = 0
        let moveX = 0
        let moveZ = 0

        this.raycaster.ray.origin.copy( this.model.position )
        this.raycaster.ray.origin.y -= 0.1;
        const intersections = this.raycaster.intersectObjects( this.objects, false )
        const onObject = intersections.length > 0
        if (!onObject) {
          if (this.model.position.y < -40) {
            this.model.position.x = 0
            this.model.position.y = 10
            this.model.position.z = 0
            this.camera.position.y = 14
            this.camera.position.z = 25
            this.camera.position.x = 0
          }
          if (this.jumpHigh === 0) {
            moveY -= 20 * delta // GRAVITY
          }
        }

        var play = '';
        if (keysPressed[' '] && this.jumpHigh == 0 && this.currentAction != 'Jump' && onObject) {
          play = 'Jump'
          this.jumpHigh = this.jumpHeight
        } else if (keysPressed['&']) {
          play = 'Wave'
        } else if (keysPressed['é']) {
          play = 'ThumbsUp'
        } else if (keysPressed['"']) {
          play = 'Yes'
        } else if (keysPressed['\'']) {
          play = 'No'
        } else if (directionPressed && this.toggleRun) {
          play = 'Running'
        } else if (directionPressed) {
          play = 'Walking'
        } else {
          play = 'Idle'
        }

        if (this.currentAction != play) {
          if (!this.playingOnce) {
            const toPlay = this.animationsMap.get(play)
            const current = this.animationsMap.get(this.currentAction)

            if(ANIMATIONPLAYONCE.includes(play) || play == 'Jump') {
              toPlay.clampWhenFinished = true;
              toPlay.loop = THREE.LoopOnce;
              this.playingOnce = true;
              this.mixer.addEventListener('finished', this.switchPlayingOnce.bind(this));
            }

            current.fadeOut(this.fadeDuration)
            toPlay
              .reset()
              .fadeIn(this.fadeDuration)
              .play();

            this.currentAction = play
          }
        }

        this.mixer.update(delta)

        if (!ANIMATIONPLAYONCE.includes(this.currentAction) && (directionPressed || this.jumpHigh > 0)) {
            // calculate towards camera direction
            var angleYCameraDirection = Math.atan2(
                    (this.camera.position.x - this.model.position.x), 
                    (this.camera.position.z - this.model.position.z))
            // diagonal movement angle offset
            var directionOffset = this.directionOffset(keysPressed)

            // rotate model
            this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset)
            this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2)

            // calculate direction
            this.camera.getWorldDirection(this.walkDirection)
            this.walkDirection.normalize()
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset)

            if (this.jumpHigh > 0) {
              const velocity = (this.jumpHigh > 3) ? this.jumpHigh * this.jumpVelocity : 30
              moveY = velocity * delta
              this.jumpHigh = ((this.jumpHigh - moveY) <= 0) ? 0 : (this.jumpHigh - moveY)
            }
            
            if (directionPressed) {
              let directionVelocity = this.currentAction == 'Running' ? this.runVelocity : this.walkVelocity
              // move model & camera
              moveX = this.walkDirection.x * directionVelocity * delta
              moveZ = this.walkDirection.z * directionVelocity * delta
            }

            this.model.position.x += moveX
            this.model.position.z += moveZ
        }
        this.model.position.y += moveY
        this.updateCameraTarget(moveX, moveY, moveZ)
    }

    private updateCameraTarget(moveX: number, moveY: number, moveZ: number) {
        // move camera
        this.camera.position.x += moveX
        this.camera.position.y += (moveY/3)
        this.camera.position.z += moveZ

        // update camera target
        this.cameraTarget.x = this.model.position.x
        this.cameraTarget.y = this.model.position.y + 3
        this.cameraTarget.z = this.model.position.z
        this.orbitControl.target = this.cameraTarget
    }

    private directionOffset(keysPressed: any) {
        var directionOffset = 0 // w

        if (keysPressed[W] || keysPressed[ArrowUp]) {
            if (keysPressed[A] || keysPressed[ArrowLeft]) {
                directionOffset = Math.PI / 4 // w+a
            } else if (keysPressed[D] || keysPressed[ArrowRight]) {
                directionOffset = - Math.PI / 4 // w+d
            }
        } else if (keysPressed[S] || keysPressed[ArrowDown]) {
            if (keysPressed[A] || keysPressed[ArrowLeft]) {
                directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
            } else if (keysPressed[D] || keysPressed[ArrowRight]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
            } else {
                directionOffset = Math.PI // s
            }
        } else if (keysPressed[A] || keysPressed[ArrowLeft]) {
            directionOffset = Math.PI / 2 // a
        } else if (keysPressed[D] || keysPressed[ArrowRight]) {
            directionOffset = - Math.PI / 2 // d
        }

        return directionOffset
    }
}