import {InteractorEvent} from "../../../Core/Interactor/InteractorEvent"
import Event from "../../../Utils/Event"
import {createCallback} from "../../../Utils/InspectorCallbacks"
import NativeLogger from "../../../Utils/NativeLogger"
import {Interactable} from "../../Interaction/Interactable/Interactable"

const TAG = "PinchButton"

@component
export class PinchButton extends BaseScriptComponent {
  @input() @hint ("What this button will spawn") NewObjectRef: ObjectPrefab
  @input() @hint ("Where it will spawn") ObjectSpawnPoint: SceneObject
  @input
  @hint(
    "Enable this to add functions from another script to this component's callback events",
  )
  editEventCallbacks: boolean = false
  @ui.group_start("On Button Pinched Callbacks")
  @showIf("editEventCallbacks")
  @input("Component.ScriptComponent")
  @hint("The script containing functions to be called when button is pinched")
  @allowUndefined
  private customFunctionForOnButtonPinched: ScriptComponent | undefined
  @input
  @hint(
    "The names for the functions on the provided script, to be called on button pinch",
  )
  @allowUndefined
  private onButtonPinchedFunctionNames: string[] = []
  @ui.group_end
  private interactable: Interactable | null = null

  private onButtonPinchedEvent = new Event<InteractorEvent>()
  public readonly onButtonPinched = this.onButtonPinchedEvent.publicApi()

  // Native Logging
  private log = new NativeLogger(TAG)

  // Generate a unique identifier for objects
  private generateUniqueId(): string {
    return `${this.NewObjectRef.name}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  onAwake(): void {
    this.interactable = this.getSceneObject().getComponent(
      Interactable.getTypeName(),
    )

    this.createEvent("OnStartEvent").bind(() => {
      if (!this.interactable) {
        throw new Error(
          "Pinch Button requires an Interactable Component on the same Scene object in order to work - please ensure one is added.",
        )
      }
      this.interactable.onTriggerEnd.add((interactorEvent: InteractorEvent) => {
        if (this.enabled) {
          // Create the new object
          const newObject = this.NewObjectRef.instantiate(this.ObjectSpawnPoint);
          
          // Generate a unique name and assign it
          const uniqueName = this.generateUniqueId();
          newObject.name = uniqueName;
          
          // Log the new name to confirm it worked
          print("Created object with unique name: " + newObject.name);

          
          
          this.onButtonPinchedEvent.invoke(interactorEvent)
        }
      })
    })
    if (this.editEventCallbacks && this.customFunctionForOnButtonPinched) {
      this.onButtonPinched.add(
        createCallback<InteractorEvent>(
          this.customFunctionForOnButtonPinched,
          this.onButtonPinchedFunctionNames,
        ),
      )
    }
  }
}