// File: CircuitGraphManager.ts
// Manages the global state of circuit connections.
// Attach this script to a dedicated SceneObject (e.g., "GraphManager").

import { validate } from "../../Utils/validate"
import { Component } from "../Core/Component"; // Import Component

// --- Placeholder imports & Declarations ---
// Assuming BaseScriptComponent, SceneObject, Transform, vec3, component etc. are defined elsewhere
declare var script: ScriptComponent; // Add this declaration if 'script' is globally available

// Assuming ScriptComponent has getSceneObject method
interface ScriptComponent {
    getSceneObject(): SceneObject;
    enabled: boolean; // Placeholder for script enable/disable
}

// --- Placeholder interfaces for SceneObject and ToggleButton ---
interface ToggleButtonScript {
    isToggledOn(): boolean;
}

// Placeholder for SceneObject, BaseScriptComponent, component
// Define basic interfaces for types used
interface SceneObject {
    name: string; // Basic SceneObject interface
    findChildByName(name: string): SceneObject | null; // Placeholder
    getComponent(typeName: string): any; // Placeholder, returning 'any' for flexibility
    getChildrenCount(): number; // Added placeholder
    getChild(index: number): SceneObject | null; // Added placeholder
}
declare var SceneObject: any; // Keep existing declaration if needed alongside interface
declare var BaseScriptComponent: any;
interface BaseScriptComponent { getSceneObject(): SceneObject; } // Add minimum interface
declare function component(target: any): any;

// Define Component interface for type usage if import is problematic
// interface Component extends BaseScriptComponent {
//     type: string;
// }


@component
export class CircuitGraphManager extends BaseScriptComponent {


    public static instance: CircuitGraphManager | null = null;

    public components: string[] = []; // List of component names (still useful for iteration)

    public connections: [string, string][] = [];

    public startConnection: [string, string] | null = null;

    /** Map storing the power status (true/false) for each component name. */
    public powered: { [key: string]: boolean } = {};

    public switchStatus: { [key: string]: boolean } = {};

    /** Map storing references to the actual Component script instances, keyed by SceneObject name. */
    private componentInstances: Map<string, Component> = new Map();


    // --- Initialization ---
    onAwake(): void {
        if (CircuitGraphManager.instance && CircuitGraphManager.instance !== this) {
            // print("CircuitGraphManager: WARNING - Multiple instances detected! Destroying this one.");
            return;
        }
        CircuitGraphManager.instance = this;
    }

    /**
     * Registers a Component instance with the manager.
     * @param component The Component script instance to register.
     */
    public registerComponent(component: Component): void {
        // Defensive check/initialization for componentInstances
        if (!this.componentInstances) {
             // print("CircuitGraphManager: WARNING - componentInstances was undefined in registerComponent! Initializing.");
            this.componentInstances = new Map();
        }

        // Ensure component and getSceneObject method exist before proceeding
        if (!component || typeof component.getSceneObject !== 'function') {
             // print("CircuitGraphManager: ERROR - Invalid component object passed to registerComponent.");
            return;
        }
        const sceneObject = component.getSceneObject();
        if (!sceneObject || !sceneObject.name) {
             // print("CircuitGraphManager: WARNING - Component on object without name cannot be registered.");
             return;
        }
        const name = sceneObject.name;
        if (!this.componentInstances.has(name)) {
            this.componentInstances.set(name, component);
            this.addComponent(name); // Keep adding the name to the 'components' list
            // print(`CircuitGraphManager: Registered component '${name}'`);
        }
    }

    /**
     * Unregisters a Component instance from the manager.
     * @param componentName The name of the component (SceneObject name) to unregister.
     */
    public unregisterComponent(componentName: string): void {
         if (this.componentInstances.has(componentName)) {
             this.componentInstances.delete(componentName);
             const index = this.components.indexOf(componentName);
             if (index > -1) {
                 this.components.splice(index, 1);
             }
             this.removeConnections(componentName); // Clean up connections associated with the removed component
             // print(`CircuitGraphManager: Unregistered component '${componentName}'`);
         }
     }


    public addConnection(componentA: string, componentB: string): void {
        if (!this.components) {
            this.components = [];
        }
        if (!this.connections) {
            this.connections = [];
        }

        this.addComponent(componentA);
        this.addComponent(componentB);

        if (componentA === componentB) {
            return;
        }

        const connectionExists = this.connections.some(conn =>
            (conn[0] === componentA && conn[1] === componentB) ||
            (conn[0] === componentB && conn[1] === componentA)
        );

        if (!connectionExists) {
            const newConnection: [string, string] = [componentA, componentB];
            this.connections.push(newConnection);

            if (this.startConnection === null) {
                this.startConnection = newConnection;
            }
        }

        this.logCurrentGraph();
        const cycles = this.findCycles();
        this.updatePower(cycles);
    }

    /**
     * Resets the graph state (clears components, connections, startConnection).
     */
    public resetGraph(): void {
        this.components = [];
        this.connections = [];
        this.startConnection = null;
        this.componentInstances.clear(); // Clear the instance map
        this.powered = {}; // Also reset power status
        this.logCurrentGraph();
    }

    /**
     * Finds all cycles in the connection graph.
     * @returns A list of cycles, where each cycle is represented as a list of component names.
     */
    public findCycles(): string[][] {
        const cycles: string[][] = [];
        const visited: Set<string> = new Set();
        const recursionStack: Set<string> = new Set();
        const parentMap: Map<string, string | null> = new Map(); // To reconstruct cycles
        if (!this.components) {
            return cycles;
        }

        for (const component of this.components) {
            if (!visited.has(component)) {
                this.findCyclesDFS(component, visited, recursionStack, parentMap, cycles);
            }
        }
        return cycles;
    }

    /**
     * Depth First Search helper to find cycles.
     * @param node The current node being visited.
     * @param visited Set of all visited nodes.
     * @param recursionStack Set of nodes currently in the recursion stack (current path).
     * @param parentMap Map to store the parent of each node in the DFS tree.
     * @param cycles List to accumulate found cycles.
     */
    private findCyclesDFS(
        node: string,
        visited: Set<string>,
        recursionStack: Set<string>,
        parentMap: Map<string, string | null>,
        cycles: string[][]
    ): void {
        visited.add(node);
        recursionStack.add(node);

        const neighbors = this.getNeighbors(node);

        for (const neighbor of neighbors) {
             // Avoid going back to the immediate parent in the DFS tree
             if (neighbor === parentMap.get(node)) {
                continue;
             }

            if (recursionStack.has(neighbor)) {
                // Cycle detected
                const cycle: string[] = [];
                let currentNode: string | null = node;
                while (currentNode && currentNode !== neighbor) {
                    cycle.unshift(currentNode);
                    currentNode = parentMap.get(currentNode) ?? null;
                }
                if (currentNode === neighbor) {
                     cycle.unshift(neighbor); // Add the start of the cycle
                     // Normalize and add cycle if not already found (optional, avoids permutations)
                     const normalizedCycle = [...cycle].sort().join(',');
                     if (!cycles.some(c => [...c].sort().join(',') === normalizedCycle)) {
                         cycles.push(cycle);
                     }
                }

            } else if (!visited.has(neighbor)) {
                 parentMap.set(neighbor, node);
                this.findCyclesDFS(neighbor, visited, recursionStack, parentMap, cycles);
            }
        }

        recursionStack.delete(node);
    }

    /**
     * Gets the neighbors of a given component based on the connections.
     * @param componentName The name of the component.
     * @returns A list of neighboring component names.
     */
    private getNeighbors(componentName: string): string[] {
        const neighbors: string[] = [];
        for (const [compA, compB] of this.connections) {
            if (compA === componentName) {
                neighbors.push(compB);
            } else if (compB === componentName) {
                neighbors.push(compA);
            }
        }
        return neighbors;
    }

    // --- Private Helper Methods ---

    /** Adds a component name to the list if it's not already present. */
    private addComponent(componentName: string): void {
        if (!this.components) {
            this.components = [];
        }

        if (!this.components.includes(componentName)) {
            this.components.push(componentName);
        }
    }

    /** Logs the current state of the connections. */
    private logCurrentGraph(): void {
        try {
             // print("Current Connections: " + JSON.stringify(this.connections, null, 2));
             // print("Current Components: " + JSON.stringify(this.components));
             // print("Registered Instances: " + JSON.stringify(Array.from(this.componentInstances.keys())));
        } catch (e: any) {
            // print("Error logging graph: " + e.message);
        }
    }

    destroy(): void {
        if (CircuitGraphManager.instance === this) {
            CircuitGraphManager.instance = null;
        }
    }

    /**
     * Updates the power status of components based on detected cycles.
     * A component is considered powered if it's part of any cycle *that contains a battery*.
     * @param cycles The list of cycles found in the graph (output of findCycles).
     */
    public updatePower(cycles: string[][]): void {
        // Use a temporary map/set to track power status based on battery-containing cycles
        const componentsInPoweredCycles = new Set<string>();

        for (const cycle of cycles) {
            let hasBattery = false;
            let cycleBrokenBySwitch = false; // Flag to track if a switch broke the cycle

            // First pass: Check for batteries and off switches in the cycle
            for (const componentName of cycle) {
                const componentInstance = this.componentInstances.get(componentName);
                if (!componentInstance) continue; // Skip if instance not found

                // Check for Battery
                if (componentInstance.type === "Battery") {
                    hasBattery = true;
                    // Don't break here, need to check all components for switches
                }

                // Check for Switch
                if (componentInstance.type === "Switch") {
                    // print("CircuitGraphManager: Switch found!"); // Commented out due to linter error
                    const sceneObject = componentInstance.getSceneObject();
                    cycleBrokenBySwitch = !this.switchStatus[sceneObject.name];
                }
            } // End of first pass through cycle components

            // If the cycle has a battery AND was not broken by an off switch, power its components
            if (hasBattery && !cycleBrokenBySwitch) {
                for (const componentName of cycle) {
                    // Check if component instance still exists before adding (belt-and-suspenders)
                    if (this.componentInstances.has(componentName)) {
                        componentsInPoweredCycles.add(componentName);
                    }
                }
            }
        } // End of iterating through all cycles

        // Update the main powered status map based on the findings
        const newPoweredStatus: { [key: string]: boolean } = {};
        if (this.components) { // Check if components list exists
            for (const componentName of this.components) {
                 // A component is powered if it's registered and part of a valid, battery-powered cycle
                newPoweredStatus[componentName] = componentsInPoweredCycles.has(componentName);
            }
        }
        this.powered = newPoweredStatus; // Assign the newly calculated status


        // Log the power status with component states
        // print("Circuit Power Status (Battery & Switch Filtered) - Components: " + JSON.stringify(this.powered, null, 2));
    }

    /**
     * Manually triggers a recalculation of cycles and updates the power status for all components.
     */
    public update(componentName: string, isToggledOn: boolean): void {
        // print("CircuitGraphManager: Manual update requested."); // Commented out due to linter error

        // Defensive check: Ensure switchStatus is initialized
        if (!this.switchStatus) {
             // print("CircuitGraphManager: WARNING - switchStatus was undefined in update! Re-initializing.");
            this.switchStatus = {};
        }

        this.switchStatus[componentName] = isToggledOn;
        if (this.connections) {
        this.updatePower(this.findCycles());
        }
    }

    public removeConnections(componentA: string): void {
        if (!this.connections) {
            this.connections = [];
            return; // No connections to remove
        }

        const initialLength = this.connections.length;
        this.connections = this.connections.filter(conn => {
            const isMatch = (conn[0] === componentA || conn[1] === componentA);
            return !isMatch;
        });

        if (this.connections.length < initialLength) {
             // Log updated graph after successful removal
            this.logCurrentGraph();
             // Recalculate power after removing connections
            this.updatePower(this.findCycles()); // Recalculate power
        }
    }

    public removeConnection(componentA: string, componentB: string): void {
        // print(); // Linter Fix Placeholder: Log "Entering removeConnection"
        if (!this.connections) {
            this.connections = [];
            return; 
        }

        const initialLength = this.connections.length;
        this.connections = this.connections.filter(conn => {
            const isMatch = (conn[0] === componentA && conn[1] === componentB) ||
                          (conn[0] === componentB && conn[1] === componentA);
            return !isMatch;
        });

        if (this.connections.length < initialLength) {
             // print(); // Linter Fix Placeholder: Log "Connection removed"
             // Update graph log, power state, and lights after successful removal
            this.logCurrentGraph();
            this.updatePower(this.findCycles()); // Recalculate power
        } else {
            // print(); // Linter Fix Placeholder: Log "Connection not found for removal"
        }
    }
} 