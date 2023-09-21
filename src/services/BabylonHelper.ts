import * as GUI from "@babylonjs/gui/2D";
import * as BABYLON from "@babylonjs/core";

// Create base objects for BABYLON scene.
export function CreateStage(scene: BABYLON.Scene): {
  highlight: BABYLON.HighlightLayer;
  camera: BABYLON.ArcRotateCamera;
  ground: BABYLON.GroundMesh;
  canvas: BABYLON.Nullable<HTMLCanvasElement>;
} {
  let canvas = scene.getEngine().getRenderingCanvas();
  let highlight = new BABYLON.HighlightLayer("hl1", scene);
  let camera = CreateCamera(scene);
  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  light.intensity = 0.7;
  let ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 20, height: 20 },
    scene
  );
  return { highlight, camera, ground, canvas };
}

export function CreateButton(
  name: string,
  text: string,
  width: string,
  height: string,
  isVisible: boolean,
  position: { top: string; left: string } | null = null,
  linkOffset: { x: number; y: number} | null = null,
): GUI.Button {
  const button = GUI.Button.CreateSimpleButton(name, text);
  button.width = width;
  button.height = height;
  button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  button.color = "white";
  button.background = "blue";
  button.fontSize = 12;
  button.isVisible = isVisible;
  if (position !== null) {
    button.top = position.top;
    button.left = position.left;
  }
  if(linkOffset !== null){
    button.linkOffsetX = linkOffset.x;
    button.linkOffsetY = linkOffset.y;
  }
  return button;
}

export function CreateInput(): GUI.InputTextArea {
  let memoInput = new GUI.InputTextArea();
  memoInput.width = "200px";
  memoInput.height = "80%";
  memoInput.isVisible = false;
  memoInput.background = "lightgray";
  memoInput.focusedBackground = "white";
  memoInput.color = "black";
  memoInput.linkOffsetX = 200;

  return memoInput;
}

function CreateCamera(scene: BABYLON.Scene): BABYLON.ArcRotateCamera {
  const camera = new BABYLON.ArcRotateCamera("camera1", Math.PI / 2, Math.PI / 3, 20, BABYLON.Vector3.Zero(), scene);
  camera.wheelPrecision = 50;
  let canvas = scene.getEngine().getRenderingCanvas();
  camera.lowerAlphaLimit = 0;
  camera.upperAlphaLimit = Math.PI;
  camera.lowerBetaLimit = Math.PI/3;
  camera.upperBetaLimit = Math.PI/2.1;
  camera.lowerRadiusLimit= 3;
  camera.attachControl(canvas, true);
  

  return camera;
}
