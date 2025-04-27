// Component.ts
// A base component script to identify the type of a circuit element.

// --- Placeholder imports for Lens Studio ---
// import { BaseScriptComponent, component, input } from "SOME_FRAMEWORK_API"; // Replace with actual Lens Studio API path
// ---

// --- Placeholder declarations ---
// Assuming BaseScriptComponent, component, input are declared globally or imported
declare var BaseScriptComponent: any; 
declare var component: any; 
declare var input: any;
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

    // Optional: Add lifecycle methods if needed later
    // onAwake(): void {
    //     if (!this.type) {
    //         // Add actual logging function if needed
    //         // print(`WARN: Component script on object '${this.getSceneObject().name}' has no type assigned.`);
    //     }
    // }
} 