import * as GUI from "@babylonjs/gui/2D";

export function CreateButton(
  name: string,
  text: string,
  position: { top: number; left: number } | null = null
): GUI.Button {
  const button = GUI.Button.CreateSimpleButton(name, text);
  button.width = "100px";
  button.height = "20px";
  button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  button.color = "white";
  button.background = "blue";
  button.fontSize = 12;
  if (position !== null) {
    button.top = `${position.top}px`;
    button.left = `${position.left}px`;
  }
  return button;
}
