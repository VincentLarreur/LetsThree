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
    jumpState: number = 0 // 0 onTheGround 1 ascendant 2 descendant
    playingOnce: boolean = false
    currentAction: string
    
    // temporary data
    walkDirection = new THREE.Vector3()
    rotateAngle = new THREE.Vector3(0, 1, 0)
    rotateQuarternion: THREE.Quaternion = new THREE.Quaternion()
    cameraTarget = new THREE.Vector3()
    
    // constants
    fadeDuration: number = 0.2
    runVelocity = 15
    walkVelocity = 5
    jumpVelocity = 150
    jumpHeight = 8

    constructor(model: THREE.Group,
        mixer: THREE.AnimationMixer, animationsMap: Map<string, THREE.AnimationAction>,
        orbitControl: OrbitControls, camera: THREE.Camera,
        currentAction: string) {
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

        var play = '';
        if (keysPressed[' ']) {
          play = 'Jump'
          if (this.jumpState == 0) {
            this.jumpState = 1
          }
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

        if (!ANIMATIONPLAYONCE.includes(this.currentAction) && (directionPressed || this.jumpState != 0)) {
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

            let moveY = 0

            if (this.jumpState != 0) {
              const velocity = (this.model.position.y > 3) ? this.jumpVelocity / this.model.position.y : 30
              if (this.jumpState == 1) {
                if (this.model.position.y > this.jumpHeight) {
                  this.jumpState = 2
                } else {
                  moveY += velocity * delta
                }
              } else if (this.jumpState == 2) {
                if (this.model.position.y <= 0) {
                  this.jumpState = 0
                } else {
                  moveY -= velocity * delta
                  if ((this.model.position.y + moveY) <= 0) {
                    moveY = -(this.model.position.y)
                  }
                }
              }
            }

            let moveX = 0
            let moveZ = 0
            if (directionPressed) {
              // run/walk velocity
              const velocity = this.currentAction == 'Running' ? this.runVelocity : this.walkVelocity
              // move model & camera
              moveX = this.walkDirection.x * velocity * delta
              moveZ = this.walkDirection.z * velocity * delta
            }

            this.model.position.x += moveX
            this.model.position.y += moveY
            this.model.position.z += moveZ
            this.updateCameraTarget(moveX, moveY, moveZ)
        }
    }

    private updateCameraTarget(moveX: number, moveY: number, moveZ: number) {
        // move camera
        this.camera.position.x += moveX
        this.camera.position.y += moveY
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