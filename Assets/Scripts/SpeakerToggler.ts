// SpeakerToggler.ts
// Controls an AudioComponent based on power state from CircuitGraphManager.

import { CircuitGraphManager } from "../SpectaclesInteractionKit/Components/Managers/CircuitGraphManager";

// --- Placeholder imports/declarations for Lens Studio API ---
// You MUST replace these with actual imports for your Lens Studio version
declare var global: any;
declare function print(message: string): void;
declare var component: any; // Decorator
declare var input: any; // Decorator
declare var ScriptComponent: any; // Base class
declare var SceneObject: any;
declare var AudioTrackAsset: any; // Declare the specific asset type directly
declare var AudioComponent: { new(): any; audioTrack: any; play: (loops: number) => void; stop: (fade?: boolean) => void; isPlaying(): boolean }; // Type for audio component
// ---

@component
export class SpeakerToggler extends BaseScriptComponent {
    /**
     * Assign the Audio Track asset here in the Inspector.
     */
    @input // <-- Use correct decorator
    audioTrack: AudioTrackAsset;

    private componentName: string = "";
    private audioComponent: InstanceType<typeof AudioComponent> | null = null;
    private isSetupValid: boolean = false;

    onAwake(): void {
        this.componentName = this.getSceneObject().name;
        
        this.audioComponent = this.getSceneObject().getComponent("AudioComponent") as InstanceType<typeof AudioComponent> | null;

        this.validateSetup();
        this.setInitialState();
    }

    onStart(): void {
        // Register with the manager
        if (CircuitGraphManager.instance) {
             // NOTE: We need to add register/unregisterSpeakerToggler to CircuitGraphManager
            CircuitGraphManager.instance.registerSpeakerToggler(this.componentName, this); 
        } else {
            // Add actual logging if needed
        }
    }

    private validateSetup(): void {
        if (!this.audioTrack) {
            // Add actual logging - print(`WARN: [${this.componentName}] SpeakerToggler: Audio Track not assigned.`);
            this.isSetupValid = false;
            return;
        }
        if (!this.audioComponent) {
             // Add actual logging - print(`WARN: [${this.componentName}] SpeakerToggler: AudioComponent not found on this object.`);
            this.isSetupValid = false;
            return;
        }
        
        // Assign the track to the component
        try {
            this.audioComponent.audioTrack = this.audioTrack;
            this.isSetupValid = true;
        } catch (e: any) {
            // Add actual logging - print(`ERROR: [${this.componentName}] Failed to assign audio track: ${e.message || e}`);
            this.isSetupValid = false;
        }
    }

    private setInitialState(): void {
        if (!this.isSetupValid) return;
        // Ensure audio is stopped initially
        this.audioComponent?.stop(false);
    }

    /**
     * Plays or stops the audio based on the power state.
     * Expected to be called externally by CircuitGraphManager.
     * @param isPowered The current power state for this component.
     */
    public updateSpeakerState(isPowered: boolean): void {
        if (!this.isSetupValid || !this.audioComponent) return;

        try {
            if (isPowered) {
                // Play looping if not already playing
                if (!this.audioComponent.isPlaying()) {
                   this.audioComponent.play(-1); // Play looping (-1 usually means loop indefinitely)
                   // Add actual logging - print(`[${this.componentName}] Speaker ON`);
                }
            } else {
                // Stop playing
                 if (this.audioComponent.isPlaying()) {
                    this.audioComponent.stop(false);
                    // Add actual logging - print(`[${this.componentName}] Speaker OFF`);
                 }
            }
        } catch (e: any) {
             // Add actual logging - print(`ERROR: [${this.componentName}] Failed to play/stop audio: ${e.message || e}`);
        }
    }

    onDestroy(): void {
        // Stop audio and unregister
        this.audioComponent?.stop(false);
        if (CircuitGraphManager.instance) {
             // NOTE: We need to add register/unregisterSpeakerToggler to CircuitGraphManager
            CircuitGraphManager.instance.unregisterSpeakerToggler(this.componentName);
        }
    }
}
