// -----JS CODE HEAD-----
// Simple Drag & Collision Log Script
// Place this script ON EACH SceneObject you want to track.
// Logs when dragging starts and if it's overlapping another collider on drop.

// @input bool enableDebugPrints = false // Optional: Turn on extra logs

// Self-references (automatically determined)
var draggableObject;
var draggableTransform; // Need this back to move the object
var draggableCollider;
var interactionComponent; // Requires InteractionComponent on the object

// State
var isDragging = false;
var touchId = -1; // Keep track of the touch initiating the drag
var currentOverlappingTargets = []; // Store SceneObjects currently overlapped

function initialize() {
    // Get references that should be available immediately
    draggableObject = script.getSceneObject();
    draggableTransform = draggableObject.getTransform(); // Get the transform
    draggableCollider = draggableObject.getComponent("Physics.ColliderComponent");
    interactionComponent = draggableObject.getComponent("InteractionComponent");

    // --- Validate CORE Components EARLY ---
    if (!draggableCollider) {
        print("ERROR: [" + draggableObject.name + "] Missing Physics.ColliderComponent! Script disabled.");
        script.enabled = false; // Disable script if setup is wrong
        return;
    }
    if (!interactionComponent) {
        print("ERROR: [" + draggableObject.name + "] Missing InteractionComponent! Script disabled.");
        script.enabled = false;
        return;
    }

    // --- Setup Overlap Events --- (Needed to know overlap state on drop)
    draggableCollider.onOverlapEnter.add(handleOverlapEnter);
    draggableCollider.onOverlapExit.add(handleOverlapExit);

    // --- Setup Interaction Events for Dragging Start/End --- 
    interactionComponent.onTouchStart.add(handleTouchStart);
    // interactionComponent.onTouchMove.add(handleTouchMove); // No longer needed
    interactionComponent.onTouchEnd.add(handleTouchEnd);

    print("Collision Log Script Initialized for: " + draggableObject.name);
}

// --- Overlap Event Handlers --- (Keep these to track overlap state)

function handleOverlapEnter(eventArgs) {
    var otherCollider = eventArgs.overlap.collider;
    if (!otherCollider) return; 
    var otherObject = otherCollider.getSceneObject();

    if (!otherObject || otherObject === draggableObject) {
        return;
    }

    if (script.enableDebugPrints) {
        print("DEBUG [" + draggableObject.name + "] Overlap ENTERED with: " + otherObject.name);
    }

    if (currentOverlappingTargets.indexOf(otherObject) === -1) {
        currentOverlappingTargets.push(otherObject);
    }
}

function handleOverlapExit(eventArgs) {
    var otherCollider = eventArgs.overlap.collider;
     if (!otherCollider) return; 
    var otherObject = otherCollider.getSceneObject();

    if (!otherObject || otherObject === draggableObject) {
        return;
    }

    if (script.enableDebugPrints) {
        print("DEBUG [" + draggableObject.name + "] Overlap EXITED with: " + otherObject.name);
    }

    var index = currentOverlappingTargets.indexOf(otherObject);
    if (index > -1) {
        currentOverlappingTargets.splice(index, 1);
    }
}

// --- Touch Event Handlers --- (Reverted from Trigger Event Handlers)

function handleTouchStart(eventArgs) { // Renamed back from handleTriggerStart
    print("RAW LOG: [" + draggableObject.name + "] handleTouchStart function entered."); // Reverted print

    // Only start drag if not already dragging (prevents issues with multiple touches)
    if (!isDragging) { 
        print("LOG: [" + draggableObject.name + "] Drag Started."); // Reverted print
        isDragging = true;
        touchId = eventArgs.touchId; // Store which touch started the drag
        
        // Clear previous overlap state *at the start* of a new drag
        currentOverlappingTargets = []; 
    }
}

// function handleTouchMove(eventArgs) { // No longer needed
//     // ... 
// }

function handleTouchEnd(eventArgs) { // Renamed back from handleTriggerEnd
    // Only process the end event if it matches the touch that started the drag
    if (isDragging && eventArgs.touchId === touchId) { 
        isDragging = false;
        touchId = -1;

        print("LOG: [" + draggableObject.name + "] Drop Detected."); // Reverted print

        // Check current overlap state & Snap if possible
        if (currentOverlappingTargets.length > 0) {
            var targetToSnapTo = currentOverlappingTargets[0]; // Get the first overlapping object

            // Safety check: Ensure the target object still exists and has a transform
            if (targetToSnapTo && targetToSnapTo.getTransform()) {
                var targetPosition = targetToSnapTo.getTransform().getWorldPosition();
                
                // --- SNAP ACTION --- 
                 draggableTransform.setWorldPosition(targetPosition);
                print("LOG: [" + draggableObject.name + "] Snapped to: [" + targetToSnapTo.name + "]");
                
            } else {
                print("LOG: [" + draggableObject.name + "] Overlapped target was invalid/destroyed. No snap performed.");
                // Optionally print non-colliding message here too if snap fails
                // print("LOG: [" + draggableObject.name + "] Is NOT colliding with any valid object.");
            }

            // --- Simplified Log ---
            print("LOG: [" + draggableObject.name + "] Ended drag while overlapping " + currentOverlappingTargets.length + " object(s).");

        } else {
            print("LOG: [" + draggableObject.name + "] Is NOT colliding with any other object.");
        }

        // It's generally good practice to clear the list *after* checking, 
        // although handleTouchStart already clears it for the next drag.
        // currentOverlappingTargets = []; 
    }
}

// --- Helper Functions Removed --- 
// findTargetToSnapTo() removed
// screenSpaceToWorldSpace() removed
// getCamera() removed

// Initialize the script
initialize();