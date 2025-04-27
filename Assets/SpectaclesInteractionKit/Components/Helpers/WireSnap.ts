// Implements wire-based snapping with two end connectors
// Handles snapping when dragging either the wire or individual spheres

import { validate } from "../../Utils/validate"
import { Interactable } from "../Interaction/Interactable/Interactable"
import Event, { unsubscribe } from "../../Utils/Event" // Assuming Event utility exists
import { CircuitGraphManager } from "../Managers/CircuitGraphManager"

// --- Placeholder imports for expected framework types ---
// import { BaseScriptComponent, component, input } from "SOME_FRAMEWORK_API"
// import { SceneObject, Transform, ColliderComponent } from "SOME_FRAMEWORK_API"
// import { print } from "SOME_FRAMEWORK_API"
// --------------------------------------------------------

/**
 * Wire connector that manages two spheres at opposite ends and their snapping behavior.
 * This component goes on the parent wire object and references both connector spheres.
 * Handles snapping when dragging the wire itself or either connector sphere.
 */
@component
export class WireSnapBehavior extends BaseScriptComponent {
    // References to both connector spheres
    @input() firstConnectorSphere: SceneObject | null = null
    @input() secondConnectorSphere: SceneObject | null = null
    @input() enableDebugPrints: boolean = false // Optional: Turn on extra logs

    // --- Component References ---
    private wireTransform: Transform | null = null // The wire's transform
    private wireInteractable: Interactable | null = null // The wire's interactable component
    private firstSphereInteractable: Interactable | null = null
    private secondSphereInteractable: Interactable | null = null
    private firstSphereCollider: ColliderComponent | null = null
    private secondSphereCollider: ColliderComponent | null = null
    private firstSphereTransform: Transform | null = null
    private secondSphereTransform: Transform | null = null

    // --- State ---
    private activeDragSource: SceneObject | null = null // Currently dragged object (wire or sphere)
    private isDragging: boolean = false // Is any part of the system being dragged
    private firstSphereOverlappingTargets: SceneObject[] = []
    private secondSphereOverlappingTargets: SceneObject[] = []
    private firstSphereSnappedTo: string | null = null
    private secondSphereSnappedTo: string | null = null

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
        const wireObject = this.getSceneObject()
        this.wireTransform = wireObject.getTransform()
        this.wireInteractable = wireObject.getComponent(Interactable.getTypeName())

        // Validate inputs
        if (!this.firstConnectorSphere) {
            print(`ERROR: [${wireObject.name}] WireSnapBehavior: Missing firstConnectorSphere reference! Script disabled.`)
            this.enabled = false
            return
        }
        if (!this.secondConnectorSphere) {
            print(`ERROR: [${wireObject.name}] WireSnapBehavior: Missing secondConnectorSphere reference! Script disabled.`)
            this.enabled = false
            return
        }

        // Get components from first sphere
        this.firstSphereInteractable = this.firstConnectorSphere.getComponent(Interactable.getTypeName())
        this.firstSphereCollider = this.firstConnectorSphere.getComponent("Physics.ColliderComponent") as ColliderComponent | null
        this.firstSphereTransform = this.firstConnectorSphere.getTransform()

        // Get components from second sphere
        this.secondSphereInteractable = this.secondConnectorSphere.getComponent(Interactable.getTypeName())
        this.secondSphereCollider = this.secondConnectorSphere.getComponent("Physics.ColliderComponent") as ColliderComponent | null
        this.secondSphereTransform = this.secondConnectorSphere.getTransform()

        // --- Validate Components ---
        // Wire Interactable is optional, so no validation needed there
        if (!this.firstSphereCollider || !this.secondSphereCollider) {
            print(`ERROR: [${wireObject.name}] WireSnapBehavior: Missing Physics.ColliderComponent on one or both spheres! Script disabled.`)
            this.enabled = false
            return
        }
        if (!this.firstSphereTransform || !this.secondSphereTransform) {
            print(`ERROR: [${wireObject.name}] WireSnapBehavior: Missing Transform component on one or both spheres! Script disabled.`)
            this.enabled = false
            return
        }

        // --- Setup Callbacks ---
        this.setupInteractionCallbacks()
        this.setupColliderCallbacks()

        // print(`WireSnapBehavior Initialized for: ${wireObject.name}`)
    }

    destroy(): void {
        if (this.enableDebugPrints) {
            print(`WireSnapBehavior Destroying for: ${this.getSceneObject()?.name}`);
        }
        this.unSubscribeList.forEach((sub) => sub());
        this.unSubscribeList = [];
    }

    // --- Callback Setups ---

    private setupInteractionCallbacks() {
        // Wire interactable (if it exists)
        if (this.wireInteractable) {
            this.unSubscribeList.push(
                this.wireInteractable.onTriggerStart.add(() => this.handleDragStart(this.getSceneObject()))
            )
            this.unSubscribeList.push(
                this.wireInteractable.onTriggerEnd.add(() => this.handleDragEnd())
            )
            this.unSubscribeList.push(
                this.wireInteractable.onTriggerCanceled.add(() => this.handleDragEnd())
            )
        }

        // First sphere interactable (if it exists)
        if (this.firstSphereInteractable) {
            this.unSubscribeList.push(
                this.firstSphereInteractable.onTriggerStart.add(() => this.handleDragStart(this.firstConnectorSphere))
            )
            this.unSubscribeList.push(
                this.firstSphereInteractable.onTriggerEnd.add(() => this.handleDragEnd())
            )
            this.unSubscribeList.push(
                this.firstSphereInteractable.onTriggerCanceled.add(() => this.handleDragEnd())
            )
        }

        // Second sphere interactable (if it exists)
        if (this.secondSphereInteractable) {
            this.unSubscribeList.push(
                this.secondSphereInteractable.onTriggerStart.add(() => this.handleDragStart(this.secondConnectorSphere))
            )
            this.unSubscribeList.push(
                this.secondSphereInteractable.onTriggerEnd.add(() => this.handleDragEnd())
            )
            this.unSubscribeList.push(
                this.secondSphereInteractable.onTriggerCanceled.add(() => this.handleDragEnd())
            )
        }
    }

    private setupColliderCallbacks() {
        validate(this.firstSphereCollider)
        validate(this.secondSphereCollider)

        // First sphere overlap events
        const firstEnterEventReg = this.firstSphereCollider.onOverlapEnter.add((eventArgs: any) => 
            this.handleOverlapEnter(eventArgs, this.firstConnectorSphere, this.firstSphereOverlappingTargets))
        
        const firstExitEventReg = this.firstSphereCollider.onOverlapExit.add((eventArgs: any) => 
            this.handleOverlapExit(eventArgs, this.firstConnectorSphere, this.firstSphereOverlappingTargets))

        // Second sphere overlap events
        const secondEnterEventReg = this.secondSphereCollider.onOverlapEnter.add((eventArgs: any) => 
            this.handleOverlapEnter(eventArgs, this.secondConnectorSphere, this.secondSphereOverlappingTargets))
        
        const secondExitEventReg = this.secondSphereCollider.onOverlapExit.add((eventArgs: any) => 
            this.handleOverlapExit(eventArgs, this.secondConnectorSphere, this.secondSphereOverlappingTargets))

        // Push unsubscribe functions to the list
        this.unSubscribeList.push(() => {
            if (this.firstSphereCollider && firstEnterEventReg) {
                this.firstSphereCollider.onOverlapEnter.remove(firstEnterEventReg)
            }
        })
        this.unSubscribeList.push(() => {
            if (this.firstSphereCollider && firstExitEventReg) {
                this.firstSphereCollider.onOverlapExit.remove(firstExitEventReg)
            }
        })
        this.unSubscribeList.push(() => {
            if (this.secondSphereCollider && secondEnterEventReg) {
                this.secondSphereCollider.onOverlapEnter.remove(secondEnterEventReg)
            }
        })
        this.unSubscribeList.push(() => {
            if (this.secondSphereCollider && secondExitEventReg) {
                this.secondSphereCollider.onOverlapExit.remove(secondExitEventReg)
            }
        })
    }

    // --- Event Handlers ---

    private handleDragStart = (dragSource: SceneObject | null) => {
        if (!dragSource) return;
        
        const wireObject = this.getSceneObject();
        if (this.enableDebugPrints) {
            print(`DEBUG [${wireObject.name}] WireSnapBehavior: Drag Started on ${dragSource.name}.`)
        }
        
        // Mark which object is being actively dragged (wire or sphere)
        this.activeDragSource = dragSource;
        this.isDragging = true;
        
        // We don't clear the overlapping targets on drag start anymore
        // This allows us to maintain overlap state throughout the drag
    }

    private handleDragEnd = () => {
        if (!this.isDragging) return; // Don't process if not dragging
        
        const wireObject = this.getSceneObject();
        
        if (this.enableDebugPrints) {
            print(`DEBUG [${wireObject.name}] WireSnapBehavior: Drag Ended on ${this.activeDragSource?.name || "unknown"}.`)
        }

        // Check for overlaps and snap both spheres if needed
        this.checkAndSnapSpheres();
        
        // Reset state
        this.isDragging = false;
        this.activeDragSource = null;
    }

    private checkAndSnapSpheres() {
        const wireObject = this.getSceneObject();
        if (!wireObject) {
            print("WireSnapBehavior Error: Cannot get SceneObject.");
            return;
        }

        let snapPerformed = false;
        // REMOVED: logSphere1Connection, logSphere2Connection flags (will log based on collected targets)
        // REMOVED: sphere1TargetName, sphere2TargetName (will get names inside loops)

        // --- Find ALL valid snap targets currently overlapping each sphere ---
        let firstTarget1: SceneObject | null = null; // For physical snap calculation
        let firstTarget2: SceneObject | null = null; // For physical snap calculation
        const allValidTargets1: SceneObject[] = [];
        const allValidTargets2: SceneObject[] = [];

        // Loop for Sphere 1
        for (const obj of this.firstSphereOverlappingTargets) {
            if (obj) { 
                 if (obj !== wireObject && obj !== this.firstConnectorSphere && obj !== this.secondConnectorSphere) {
                    allValidTargets1.push(obj);
                    if (firstTarget1 === null) { // Capture the first one for physical snap
                        firstTarget1 = obj;
                    }
                    // REMOVED: break;
                 }
            }
        }

        // Loop for Sphere 2
        for (const obj of this.secondSphereOverlappingTargets) {
            if (obj) {
                 if (obj !== wireObject && obj !== this.firstConnectorSphere && obj !== this.secondConnectorSphere) {
                    allValidTargets2.push(obj);
                     if (firstTarget2 === null) { // Capture the first one for physical snap
                        firstTarget2 = obj;
                    }
                    // REMOVED: break;
                 }
            }
        }
        // -------------------------------------------------------------------

        const target1Transform = firstTarget1 ? firstTarget1.getTransform() : null; // Use FIRST target for transform
        const target2Transform = firstTarget2 ? firstTarget2.getTransform() : null; // Use FIRST target for transform
        const parentCurrentPos = wireObject.getParent()?.getTransform()?.getWorldPosition() || new vec3(0, 0, 0);
        let delta: vec3 | null = null; 

        // --- Determine which sphere dictates the PHYSICAL snap movement (Priority: Sphere 1's FIRST target) ---
        if (firstTarget1 && target1Transform && this.firstSphereTransform) {
            const sphere1Pos = this.firstSphereTransform.getWorldPosition(); 
            const target1Pos = target1Transform.getWorldPosition(); 
            delta = WireSnapBehavior.subtractVectors(target1Pos, sphere1Pos); 
            snapPerformed = true;
            // Debug log for physical snap driver
             if (this.enableDebugPrints) {
                print(`DEBUG [${wireObject.name}] Physical snap based on Sphere 1 to first target [${firstTarget1.name}].`);
             }
        }
        // --- Else, check Sphere 2's FIRST target --- 
        else if (firstTarget2 && target2Transform && this.secondSphereTransform) {
            const sphere2Pos = this.secondSphereTransform.getWorldPosition(); 
            const target2Pos = target2Transform.getWorldPosition(); 
            delta = WireSnapBehavior.subtractVectors(target2Pos, sphere2Pos); 
            snapPerformed = true;
             // Debug log for physical snap driver
             if (this.enableDebugPrints) {
                 print(`DEBUG [${wireObject.name}] Physical snap based on Sphere 2 to first target [${firstTarget2.name}].`);
             }
        }

        // --- Apply parent movement (physical snap) --- 
        if (snapPerformed && delta) { 
            const newParentPos = WireSnapBehavior.addVectors(parentCurrentPos, delta);
            wireObject.getParent()?.getTransform()?.setWorldPosition(newParentPos); 
            this.repositionWire(); // Update wire visuals based on new parent position
        }

        if (CircuitGraphManager.instance) {
            CircuitGraphManager.instance.removeConnections(wireObject.getParent()?.name);
        }

        // --- Log ALL valid connections found --- 
        if (CircuitGraphManager.instance && wireObject.getParent()?.name) {
            const loggedTargetParents = new Set<string>(); // Prevent duplicate logs for same target parent

            // Log connections for sphere 1's valid targets
            for (const targetObj of allValidTargets1) {
                const targetParentName = targetObj.getParent()?.name;
                if (targetParentName && !loggedTargetParents.has(targetParentName)) {
                    CircuitGraphManager.instance.addConnection(wireObject.getParent()?.name, targetParentName);
                    loggedTargetParents.add(targetParentName);
                    // Update snap state based on the FIRST target used for physical snap
                    if (targetObj === firstTarget1) { 
                        this.firstSphereSnappedTo = targetParentName;
                    }
                }
            }

            // Log connections for sphere 2's valid targets
            for (const targetObj of allValidTargets2) {
                const targetParentName = targetObj.getParent()?.name;
                 if (targetParentName && !loggedTargetParents.has(targetParentName)) {
                    CircuitGraphManager.instance.addConnection(wireObject.getParent()?.name, targetParentName);
                     loggedTargetParents.add(targetParentName);
                     // Update snap state based on the FIRST target used for physical snap
                     if (targetObj === firstTarget2) {
                         this.secondSphereSnappedTo = targetParentName;
                    }
                }
            }
        } else {
             // Handle missing manager or parent name
             if (!CircuitGraphManager.instance && (allValidTargets1.length > 0 || allValidTargets2.length > 0)) {
                print(`WARN: [${wireObject?.name}] CircuitGraphManager.instance not found! Cannot log connection(s).`);
             } 
             this.firstSphereSnappedTo = null; // Clear state if cannot log
             this.secondSphereSnappedTo = null;
        }

        // Clear snap state if no connection was logged for that specific sphere's *first* target
        if (!allValidTargets1.some(t => t === firstTarget1)) {
            this.firstSphereSnappedTo = null;
        }
         if (!allValidTargets2.some(t => t === firstTarget2)) {
            this.secondSphereSnappedTo = null;
        }

        // Final check if no snap occurred at all
        if (!snapPerformed && this.enableDebugPrints) {
            print(`DEBUG: [${wireObject.name}] No valid overlaps detected for physical snapping.`);
        }

        // Clear overlap tracking list AFTER processing
        this.firstSphereOverlappingTargets = [];
        this.secondSphereOverlappingTargets = [];
    }

    private handleOverlapEnter = (eventArgs: any, sphere: SceneObject | null, overlappingTargets: SceneObject[]) => {
        if (!sphere) return;
        
        const otherCollider = eventArgs.overlap.collider;
        if (!otherCollider) return;
        
        // Get the object we're overlapping with
        const otherObject = otherCollider.getSceneObject();
        const wireObject = this.getSceneObject();
        
        // Ignore self, parent, or other sphere
        if (!otherObject || 
            otherObject === wireObject || 
            otherObject === this.firstConnectorSphere || 
            otherObject === this.secondConnectorSphere) {
            return;
        }

        // Check if the overlapping object is a connection point sphere
        // Only add if it has a name containing "Connector" or "Connection" or is a sphere
        const isConnectionPoint = 
            otherObject.name.toLowerCase().includes("connector") || 
            otherObject.name.toLowerCase().includes("connection") || 
            otherObject.name.toLowerCase().includes("sphere");
            
        if (!isConnectionPoint) {
            if (this.enableDebugPrints) {
                print(`DEBUG [${wireObject.name}] WireSnapBehavior: Ignoring overlap with non-connection point [${otherObject.name}]`)
            }
            return;
        }

        // Ensure the other object isn't already being tracked
        if (overlappingTargets.indexOf(otherObject) === -1) {
            if (this.enableDebugPrints) {
                print(`DEBUG [${wireObject.name}] WireSnapBehavior: ${sphere.name} overlap ENTERED with [${otherObject.name}]`)
            }
            overlappingTargets.push(otherObject);
        }
    }

    private handleOverlapExit = (eventArgs: any, sphere: SceneObject | null, overlappingTargets: SceneObject[]) => {
        if (!sphere) return;
        
        const otherCollider = eventArgs.overlap.collider;
        if (!otherCollider) return;
        
        const otherObject = otherCollider.getSceneObject();
        const wireObject = this.getSceneObject();
        
        // Ignore self, parent, or other sphere
        if (!otherObject || 
            otherObject === wireObject || 
            otherObject === this.firstConnectorSphere || 
            otherObject === this.secondConnectorSphere) {
            return;
        }

        const index = overlappingTargets.indexOf(otherObject);
        if (index > -1) {
            if (this.enableDebugPrints) {
                print(`DEBUG [${wireObject.name}] WireSnapBehavior: ${sphere.name} overlap EXITED with [${otherObject.name}]`)
            }
            overlappingTargets.splice(index, 1);
        }
    }

    // Optional: Update wire position/rotation/scale based on the positions of both spheres
    private repositionWire() {
        // This is a placeholder for wire repositioning logic
        // Depending on how your wire is set up, you might need to:
        // 1. Adjust the wire's length based on the distance between spheres
        // 2. Orient the wire to point from one sphere to the other
        // 3. Update any visual or physics properties of the wire
        
        if (this.firstSphereTransform && this.secondSphereTransform && this.wireTransform) {
            const pos1 = this.firstSphereTransform.getWorldPosition();
            const pos2 = this.secondSphereTransform.getWorldPosition();
            
            // Example: Position wire at midpoint between spheres
            const midpoint = {
                x: (pos1.x + pos2.x) / 2,
                y: (pos1.y + pos2.y) / 2,
                z: (pos1.z + pos2.z) / 2
            };
            
            // Optional - update wire position
            // this.wireTransform.setWorldPosition(midpoint);
            
            // Additional wire updates would go here
            // (length adjustment, rotation to face between points, etc.)
        }
    }

    // --- Vector Helpers (Requires Framework-Specific vec3 Implementation) ---
    private static subtractVectors(v1: vec3, v2: vec3): vec3 {
        // Replace with framework-specific vector subtraction
        // Example: return v1.sub(v2); 
        // Example: return new vec3(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
        // Placeholder implementation (adapt to your framework):
        return new vec3(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
    }

    private static addVectors(v1: vec3, v2: vec3): vec3 {
        // Replace with framework-specific vector addition
        // Example: return v1.add(v2);
        // Example: return new vec3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
        // Placeholder implementation (adapt to your framework):
        return new vec3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
    }
}