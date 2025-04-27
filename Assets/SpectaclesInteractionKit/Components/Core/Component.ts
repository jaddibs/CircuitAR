// Component.ts
// A base component script to identify the type of a circuit element.

import { CircuitGraphManager } from "../Managers/CircuitGraphManager"; // Adjust path if needed

// --- Placeholder imports for Lens Studio ---
// import { BaseScriptComponent, component, input } from "SOME_FRAMEWORK_API"; // Replace with actual Lens Studio API path
// ---

// --- Placeholder declarations ---
// Assuming BaseScriptComponent, component, input are declared globally or imported
declare var BaseScriptComponent: any; 
interface BaseScriptComponent { getSceneObject(): SceneObject; } // Add minimum interface
declare var component: any; 
declare var input: any;
declare var script: ScriptComponent; // Assuming script is global
interface ScriptComponent { getSceneObject(): SceneObject; } // Add minimum interface
declare var SceneObject: any; // Placeholder
interface SceneObject { name: string; } // Add minimum interface
// ---

/**
 * Attaches metadata to a SceneObject, primarily its functional type within the circuit.
 */
@component
export class Component extends BaseScriptComponent {

    /** 
     * The functional type of this component (e.g., "Battery", "LED", "Motor", "Wire", "Switch"). 
     * Set this value in the Inspector panel for each component object.
     */
    @input() public type: string = ""; 

    onAwake(): void {
        if (!this.type) {
            // Add actual logging function if needed
             // print(`WARN: Component script on object '${this.getSceneObject().name}' has no type assigned.`);
        }
        // Register with the CircuitGraphManager
        if (CircuitGraphManager.instance) {
            CircuitGraphManager.instance.registerComponent(this);
        }
    }

    onDestroy(): void {
        // Unregister from the CircuitGraphManager
        if (CircuitGraphManager.instance && this.getSceneObject()) { // Check instance and object exist
            CircuitGraphManager.instance.unregisterComponent(this.getSceneObject().name);
        }
    }
} 