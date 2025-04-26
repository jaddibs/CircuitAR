// Renamed from InteractableLogFeedback.ts
// Implements simple snapping based on overlap, inspired by DynamicSnapAnyCollider.js
// using structure patterns from SnappableBehavior.ts

import { validate } from "../../Utils/validate"
import { Interactable } from "../Interaction/Interactable/Interactable"
import Event, { unsubscribe } from "../../Utils/Event" // Assuming Event utility exists

// --- Placeholder imports for expected framework types ---
// import { BaseScriptComponent, component, input } from "SOME_FRAMEWORK_API"
// import { SceneObject, Transform, ColliderComponent } from "SOME_FRAMEWORK_API" // Removed Physics namespace, removed OverlapEvent
// import { print } from "SOME_FRAMEWORK_API"
// --------------------------------------------------------

/**
 * Attaches simple snapping behavior to an Interactable object.
 * When dragged and released while overlapping another object with a Physics.ColliderComponent,
 * it snaps to the position of the first detected overlapping object.
 */
@component
export class SimpleSnapBehavior extends BaseScriptComponent { // Renamed class
    @input() enableDebugPrints: boolean = false // Optional: Turn on extra logs

    // --- Component References ---
    private interactable: Interactable | null = null
    private objectTransform: Transform | null = null // This object's transform
    private collider: ColliderComponent | null = null // Changed type from Physics.ColliderComponent

    // --- State ---
    private isActive: boolean = false // Is the object currently being dragged?
    private currentOverlappingTargets: SceneObject[] = [] // Track objects we are overlapping

    // --- Cleanup ---
    private unSubscribeList: unsubscribe[] = []

    // --- Initialization ---
    onAwake(): void {
        this.defineScriptEvents()
    }

    private defineScriptEvents() {
        // Use OnStartEvent assuming it's the correct lifecycle event for initialization
        const startEvent = this.createEvent("OnStartEvent").bind(() => {
            this.init()
        })
        // Note: Need a way to unsubscribe from createEvent if the object is destroyed before start
    }

    private init() {
        const sceneObject = this.getSceneObject()
        this.interactable = sceneObject.getComponent(Interactable.getTypeName())
        this.objectTransform = sceneObject.getTransform()
        this.collider = sceneObject.getComponent("Physics.ColliderComponent") as ColliderComponent | null

        // --- Validate Components ---
        if (!this.interactable) {
            print(`ERROR: [${sceneObject.name}] SimpleSnapBehavior: Missing Interactable component! Script disabled.`)
            this.enabled = false
            return
        }
        if (!this.objectTransform) {
            print(`ERROR: [${sceneObject.name}] SimpleSnapBehavior: Missing Transform component! Script disabled.`)
            this.enabled = false
            return
        }
        if (!this.collider) {
            print(`ERROR: [${sceneObject.name}] SimpleSnapBehavior: Missing Physics.ColliderComponent! Script disabled.`)
            this.enabled = false
            return
        }

        // --- Setup Callbacks ---
        this.setupInteractableCallbacks()
        this.setupColliderCallbacks()

        print(`SimpleSnapBehavior Initialized for: ${sceneObject.name}`)
    }

    destroy(): void {
        if (this.enableDebugPrints) {
            print(`SimpleSnapBehavior Destroying for: ${this.getSceneObject()?.name}`);
        }
        this.unSubscribeList.forEach((sub) => sub());
        this.unSubscribeList = [];
    }

    // --- Callback Setups ---

    private setupInteractableCallbacks() {
        validate(this.interactable)

        this.unSubscribeList.push(
            this.interactable.onTriggerStart.add(this.handleDragStart)
        )
        this.unSubscribeList.push(
            this.interactable.onTriggerEnd.add(this.handleDragEnd)
        )
        // Also handle cancellation as a drag end
        this.unSubscribeList.push(
            this.interactable.onTriggerCanceled.add(this.handleDragEnd)
        )
    }

    private setupColliderCallbacks() {
        validate(this.collider)

        // Store the event registration objects returned by .add()
        const enterEventReg = this.collider.onOverlapEnter.add(this.handleOverlapEnter)
        const exitEventReg = this.collider.onOverlapExit.add(this.handleOverlapExit)

        // Push functions to the list that perform the actual unsubscribe using .remove()
        this.unSubscribeList.push(() => {
            // Check if collider and registration still exist before removing
            if (this.collider && enterEventReg) {
                this.collider.onOverlapEnter.remove(enterEventReg)
            }
        })
        this.unSubscribeList.push(() => {
             // Check if collider and registration still exist before removing
             if (this.collider && exitEventReg) {
                this.collider.onOverlapExit.remove(exitEventReg)
            }
        })
    }

    // --- Event Handlers ---

    private handleDragStart = () => {
        // Using arrow function for correct 'this'
        if (this.enableDebugPrints) {
            print(`DEBUG [${this.getSceneObject().name}] SimpleSnapBehavior: Drag Started.`)
        }
        this.isActive = true
        // Clear previous overlap state *at the start* of a new drag
        this.currentOverlappingTargets = []
    }

    private handleDragEnd = () => {
        // Using arrow function for correct 'this'
        if (!this.isActive) return; // Don't process if not active

        this.isActive = false
        const sceneObject = this.getSceneObject()
        if (this.enableDebugPrints) {
            print(`DEBUG [${sceneObject.name}] SimpleSnapBehavior: Drag Ended (Drop Detected).`)
        }

        // Check current overlap state & Snap if possible
        if (this.currentOverlappingTargets.length > 0) {
            const targetToSnapTo = this.currentOverlappingTargets[0] // Get the first overlapping object

            if (this.enableDebugPrints) {
                 print(`DEBUG [${sceneObject.name}] SimpleSnapBehavior: Overlapping ${this.currentOverlappingTargets.length} target(s). Attempting snap to [${targetToSnapTo?.name}].`);
            }

            // Safety check: Ensure the target object still exists and has a transform
            const targetTransform = targetToSnapTo ? targetToSnapTo.getTransform() : null
            if (targetTransform && this.objectTransform) {
                const targetPosition = targetTransform.getWorldPosition()

                // --- SNAP ACTION (Instantaneous) ---
                this.objectTransform.setWorldPosition(targetPosition)
                print(`LOG: [${sceneObject.name}] SimpleSnapBehavior: Snapped to [${targetToSnapTo.name}] at ${targetPosition.toString()}.`)

            } else {
                print(`LOG: [${sceneObject.name}] SimpleSnapBehavior: Overlapped target [${targetToSnapTo?.name || 'undefined'}] was invalid or missing transform. No snap performed.`)
            }
        } else {
            print(`LOG: [${sceneObject.name}] SimpleSnapBehavior: Dropped while NOT overlapping any other valid object.`)
        }

        // Overlaps will be cleared naturally by handleOverlapExit or on next drag start
    }

    private handleOverlapEnter = (eventArgs: any) => {
        const otherCollider = eventArgs.overlap.collider
        if (!otherCollider) return
        // IMPORTANT: We assume the collider is on the object we want to snap TO.
        // If the collider is nested deeper, this needs adjustment.
        const otherObject = otherCollider.getSceneObject()
        const selfObject = this.getSceneObject()

        if (!otherObject || otherObject === selfObject) {
            return // Ignore self or invalid objects
        }

        // Ensure the other object isn't already being tracked
        if (this.currentOverlappingTargets.indexOf(otherObject) === -1) {
            if (this.enableDebugPrints) {
                 print(`DEBUG [${selfObject.name}] SimpleSnapBehavior: Overlap ENTERED with [${otherObject.name}]`)
            }
            this.currentOverlappingTargets.push(otherObject)
        } else {
             if (this.enableDebugPrints) {
                 print(`DEBUG [${selfObject.name}] SimpleSnapBehavior: Overlap ENTERED with [${otherObject.name}] (already tracked)`)
            }
        }
    }

    private handleOverlapExit = (eventArgs: any) => {
        const otherCollider = eventArgs.overlap.collider
        if (!otherCollider) return
        const otherObject = otherCollider.getSceneObject()
        const selfObject = this.getSceneObject()

        if (!otherObject || otherObject === selfObject) {
            return // Ignore self or invalid objects
        }

        const index = this.currentOverlappingTargets.indexOf(otherObject)
        if (index > -1) {
             if (this.enableDebugPrints) {
                 print(`DEBUG [${selfObject.name}] SimpleSnapBehavior: Overlap EXITED with [${otherObject.name}]`)
            }
            this.currentOverlappingTargets.splice(index, 1)
        } else {
             if (this.enableDebugPrints) {
                 print(`DEBUG [${selfObject.name}] SimpleSnapBehavior: Overlap EXITED with [${otherObject.name}] (was not tracked)`);
            }
        }
    }
}
