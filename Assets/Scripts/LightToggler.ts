/**
 * LightToggler
 * 
 * This script toggles the visibility of two objects (Light and LightOff)
 * based on the power status in the CircuitGraphManager for the component that
 * matches this object's name. It only performs toggling if both light objects
 * are properly attached.
 */
import { CircuitGraphManager } from "../SpectaclesInteractionKit/Components/Managers/CircuitGraphManager";

// Declare global types used in Lens Studio
declare var global: any;
declare function print(message: string): void;

@component
export class LightToggler extends BaseScriptComponent {
    @input
    lightObject: SceneObject;

    @input
    lightOffObject: SceneObject;

    /**
     * Update interval in seconds
     */
    @input
    updateInterval: number = 0.1;

    // Reference to the delayed callback event
    private updateEvent: any = null;
    private scriptComponent: any = null;
    
    // Store the current object's name
    private componentName: string = "";
    
    // Track previous power state to detect changes
    private previousPoweredState: boolean = false;
    
    // Flag to track if light objects are properly attached
    private hasValidLightObjects: boolean = false;

    onAwake(): void {
        // Get reference to the script component
        this.scriptComponent = this.getSceneObject().getComponent("Component.ScriptComponent");
        
        // Get the name of the current object to use as component name
        this.componentName = this.getSceneObject().name;
        print("LightToggler: Using object name as component name: " + this.componentName);
        
        // Validate light objects
        this.validateLightObjects();
        
        // Set initial state to off
        this.setInitialState();
        
        // Initialize the light state based on CircuitGraphManager
        this.updateLightState();
        
        // Set up a regular update to check power state
        this.startUpdateInterval();
    }
    
    /**
     * Validate that we have proper light objects attached
     */
    private validateLightObjects(): void {
        this.hasValidLightObjects = this.lightObject != null && this.lightOffObject != null;
        
        if (!this.hasValidLightObjects) {
            print("LightToggler WARNING: Light objects not properly attached to " + this.componentName);
        } else {
            print("LightToggler: Light objects validated for " + this.componentName);
        }
    }

    /**
     * Set initial state to false (light off)
     */
    private setInitialState(): void {
        // Only proceed if we have valid light objects
        if (!this.hasValidLightObjects) return;
        
        // Start with light off and lightOff on
        this.lightObject.enabled = false;
        this.lightOffObject.enabled = true;
        
        print("LightToggler: Set initial state to OFF for " + this.componentName);
    }

    /**
     * Start the interval to regularly check power status
     */
    private startUpdateInterval(): void {
        // Clear any existing update
        this.stopUpdateInterval();
        
        // Create a delayed callback event
        this.updateEvent = this.scriptComponent.createEvent("UpdateEvent");
        this.updateEvent.bind(this.onUpdate.bind(this));
    }

    /**
     * Called every frame by the update event
     */
    private onUpdate(): void {
        // Call update light state at regular intervals
        this.updateLightState();
    }

    /**
     * Stop the update event
     */
    private stopUpdateInterval(): void {
        if (this.updateEvent) {
            this.updateEvent.enabled = false;
            this.updateEvent = null;
        }
    }

    /**
     * Updates the light state based on the CircuitGraphManager's powered status
     */
    private updateLightState(): void {
        // Skip if we don't have valid light objects
        if (!this.hasValidLightObjects) return;
        
        // Get the CircuitGraphManager instance
        const manager = CircuitGraphManager.instance;
        
        if (!manager) {
            print("LightToggler: Warning - CircuitGraphManager instance not found");
            return;
        }
        
        // Check if the powered map exists
        if (!manager.powered) {
            // Powered map not initialized yet, keep light in initial state
            print("LightToggler: Warning - CircuitGraphManager.powered map not initialized yet");
            return;
        }
        
        // Get the power status from the manager using this object's name
        const isPowered = manager.powered[this.componentName] === true;
        
        // Only update if power state has changed
        if (isPowered !== this.previousPoweredState) {
            // Update the light objects based on the power status
            if (isPowered) {
                this.lightObject.enabled = true;
                this.lightOffObject.enabled = false;
                print("LightToggler: Power ON for " + this.componentName);
            } else {
                this.lightObject.enabled = false;
                this.lightOffObject.enabled = true;
                print("LightToggler: Power OFF for " + this.componentName);
            }
            
            // Update previous state
            this.previousPoweredState = isPowered;
        }
    }
    
    onDestroy(): void {
        // Clean up when the script is destroyed
        this.stopUpdateInterval();
    }
}