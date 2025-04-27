import {Interactable} from "./SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable"

/**
 * Script for a button that toggles visibility between UI and world elements
 */
@component
export class UIButtonScript extends BaseScriptComponent {
  @input("SceneObject")
  @hint("The UI element to hide when button is pressed")
  ui: SceneObject | undefined
  
  @input("SceneObject") 
  @hint("The world element to show when button is pressed")
  world: SceneObject | undefined
  
  private interactable: Interactable | null = null

  onAwake() {
    this.interactable = this.getSceneObject().getComponent(
      Interactable.getTypeName()
    )

    this.createEvent("OnStartEvent").bind(() => {
      if (!this.interactable) {
        throw new Error(
          "UIButtonScript requires an Interactable Component on the same Scene object in order to work - please ensure one is added."
        )
      }
      
      this.interactable.onTriggerEnd.add(() => {
        if (this.enabled) {
          this.handleButtonPress()
        }
      })
    })
  }

  private handleButtonPress() {
    if (this.ui) {
      this.ui.enabled = false
    }
    
    if (this.world) {
      this.world.enabled = true
    }
  }
}
