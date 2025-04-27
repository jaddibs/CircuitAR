// File: CircuitGraphManager.ts
// Manages the global state of circuit connections.
// Attach this script to a dedicated SceneObject (e.g., "GraphManager").

import { validate } from "../../Utils/validate" // Assuming validate exists

// --- Placeholder imports & Declarations ---
// Assuming BaseScriptComponent, SceneObject, Transform, vec3, component etc. are defined elsewhere
declare var script: ScriptComponent; // Add this declaration if 'script' is globally available

// Assuming ScriptComponent has getSceneObject method
interface ScriptComponent {
    getSceneObject(): SceneObject;
    enabled: boolean; // Placeholder for script enable/disable
}
// Placeholder for SceneObject, BaseScriptComponent, component
declare var SceneObject: any;
declare var BaseScriptComponent: any;
declare function component(target: any): any;

@component
export class CircuitGraphManager extends BaseScriptComponent {

    // --- Static Instance (Singleton Pattern) ---
    /** The singleton instance of the CircuitGraphManager. */
    public static instance: CircuitGraphManager | null = null;

    // --- Public Properties (Global State) ---

    /** List of connected component names. */
    public components: string[] = [];

    /**
     * List of connections, where each connection is a pair of component names.
     * Order within the pair doesn't matter (e.g., [A, B] is the same as [B, A]).
     */
    public connections: [string, string][] = [];

    /**
     * The very first connection made, typically from the power source.
     * Used to establish a starting point for graph traversal.
     * Format: [componentNameA, componentNameB] or null if no connection made yet.
     */
    public startConnection: [string, string] | null = null;


    // --- Initialization ---
    onAwake(): void {
        print("CircuitGraphManager: Awake");
        // Set the static instance (Singleton Pattern)
        if (CircuitGraphManager.instance && CircuitGraphManager.instance !== this) {
            print("CircuitGraphManager: WARNING - Multiple instances detected! Destroying this one.");
            // Optionally destroy this duplicate instance if the engine allows
            // this.getSceneObject().destroy(); 
            return; 
        }
        // Add log before setting the instance
        try {
             print("CircuitGraphManager: OnAwake - Initial components state: " + JSON.stringify(this.components));
        } catch (e) {
             print("CircuitGraphManager: OnAwake - Error logging components state: " + e);
        }
        CircuitGraphManager.instance = this;

        // Optionally, load initial state if needed
    }

    // --- Public Methods ---

    /**
     * Adds a connection between two circuit components.
     * Updates the 'components' and 'connections' lists.
     * Sets the 'startConnection' if this is the first connection added.
     * Ensures duplicate components and connections are not added.
     *
     * @param componentA Name of the first component.
     * @param componentB Name of the second component.
     */
    public addConnection(componentA: string, componentB: string): void {
        // --- Defensive Check & Logging ---
        if (!this.components) {
            print("CircuitGraphManager: WARNING - this.components was undefined/null in addConnection! Re-initializing.");
            this.components = [];
        }
        if (!this.connections) { // Also check connections array
            print("CircuitGraphManager: WARNING - this.connections was undefined/null in addConnection! Re-initializing.");
            this.connections = [];
        }
        try {
             print(`CircuitGraphManager: addConnection START - Components: ${JSON.stringify(this.components)} | Connections: ${JSON.stringify(this.connections)}`);
        } catch (e) {
             print("CircuitGraphManager: addConnection - Error logging state: " + e);
        }
        // --- End Check ---

        print(`CircuitGraphManager: Attempting to add connection between [${componentA}] and [${componentB}]`);

        // 1. Add components to the list if they don't exist
        this.addComponent(componentA);
        this.addComponent(componentB);

        // 2. Check if the connection already exists (order doesn't matter)
        const connectionExists = this.connections.some(conn =>
            (conn[0] === componentA && conn[1] === componentB) ||
            (conn[0] === componentB && conn[1] === componentA)
        );

        if (!connectionExists) {
            const newConnection: [string, string] = [componentA, componentB];
            this.connections.push(newConnection);
            print(`CircuitGraphManager: Added connection: [${componentA}, ${componentB}]`);

            // 3. Set the startConnection if it's the first one
            if (this.startConnection === null) {
                this.startConnection = newConnection;
                print(`CircuitGraphManager: Set start connection: [${componentA}, ${componentB}]`);
            }
        } else {
            print(`CircuitGraphManager: Connection between [${componentA}] and [${componentB}] already exists.`);
        }

        // Log current state (optional)
        this.logCurrentGraph();
    }

    /**
     * Resets the graph state (clears components, connections, startConnection).
     */
    public resetGraph(): void {
        this.components = [];
        this.connections = [];
        this.startConnection = null;
        print("CircuitGraphManager: Graph reset.");
    }

    // --- Private Helper Methods ---

    /** Adds a component name to the list if it's not already present. */
    private addComponent(componentName: string): void {
        // Defensive check
        if (!this.components) {
            print("CircuitGraphManager: WARNING - this.components was undefined/null in addComponent! Re-initializing.");
            this.components = [];
        }

        if (!this.components.includes(componentName)) {
            this.components.push(componentName);
            print(`CircuitGraphManager: Added component: ${componentName}`);
        }
    }

    /** Logs the current state of the components and connections. */
    private logCurrentGraph(): void {
        print("--- Circuit Graph State ---");
        print("Components: " + JSON.stringify(this.components));
        print("Connections: " + JSON.stringify(this.connections));
        print("Start Connection: " + JSON.stringify(this.startConnection));
        print("---------------------------");
    }

    destroy(): void {
        print("CircuitGraphManager: Destroy");
        // Clear the static instance if this instance is destroyed
        if (CircuitGraphManager.instance === this) {
            CircuitGraphManager.instance = null;
        }
        // Cleanup if needed
    }
} 