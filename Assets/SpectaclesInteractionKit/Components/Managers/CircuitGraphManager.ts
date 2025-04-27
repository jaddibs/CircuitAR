// File: CircuitGraphManager.ts
// Manages the global state of circuit connections.
// Attach this script to a dedicated SceneObject (e.g., "GraphManager").

import { validate } from "../../Utils/validate"

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


    public static instance: CircuitGraphManager | null = null;

    public components: string[] = [];

    public connections: [string, string][] = [];

    public startConnection: [string, string] | null = null;

    /** Map storing the power status (true/false) for each component name. */
    public powered: { [key: string]: boolean } = {};


    // --- Initialization ---
    onAwake(): void {
        if (CircuitGraphManager.instance && CircuitGraphManager.instance !== this) {
            print("CircuitGraphManager: WARNING - Multiple instances detected! Destroying this one.");
            return;
        }
        CircuitGraphManager.instance = this;
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
             print("Connections: " + JSON.stringify(this.connections));
        } catch (e) {
            print("CircuitGraphManager: Error logging connections state: " + e);
        }
    }

    destroy(): void {
        if (CircuitGraphManager.instance === this) {
            CircuitGraphManager.instance = null;
        }
    }

    /**
     * Updates the power status of components based on detected cycles.
     * A component is considered powered if it's part of any cycle.
     * @param cycles The list of cycles found in the graph (output of findCycles).
     */
    public updatePower(cycles: string[][]): void {
        this.powered = {}; // Reset the power status

        // Create a set of all components that are part of any cycle
        const componentsInCycles = new Set<string>();
        for (const cycle of cycles) {
            for (const component of cycle) {
                componentsInCycles.add(component);
            }
        }

        // Update the powered status for each component
        for (const component of this.components) {
             this.powered[component] = componentsInCycles.has(component);
        }

        // Optional: Log the power status
        // print("Powered status: " + JSON.stringify(this.powered));
    }
} 