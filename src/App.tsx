import React from "react";
import "./App.css";
import {
  ArcRotateCamera,
  FreeCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  Scene,
  PointerDragBehavior,
} from "@babylonjs/core";
import SceneComponent from "babylonjs-hook"; // if you install 'babylonjs-hook' NPM.
import "./App.css";

let box1: any;
let box2: any;

const onSceneReady = (scene: Scene) => {
  // This creates and positions a free camera (non-mesh)
  const camera = new ArcRotateCamera("camera1",0,0,0, new Vector3(0, 5, -10), scene);
  camera.wheelPrecision = 50;
  // This targets the camera to scene origin
  camera.setTarget(Vector3.Zero());

  const canvas = scene.getEngine().getRenderingCanvas();

  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);

  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

  // Default intensity is 1. Let's dim the light a small amount
  light.intensity = 0.7;

  // Our built-in 'box' shape.
  box1 = MeshBuilder.CreateBox("box1", { size: 2 }, scene);
  
  var pointerDragBehavior1 = new PointerDragBehavior();
  pointerDragBehavior1.onDragStartObservable.add((event) => {
    console.log("dragStart");
    console.log(event);
  });
  pointerDragBehavior1.onDragObservable.add((event) => {
    console.log("drag");
    console.log(box1.position);
  });
  pointerDragBehavior1.onDragEndObservable.add((event) => {
    console.log("dragEnd");
    console.log(event);
    box1.position.y = 1;
  });
  box1.addBehavior(pointerDragBehavior1);
  box1.position.y = 1;
  
  // Move the box upward 1/2 its height
  var pointerDragBehavior2 = new PointerDragBehavior();
  pointerDragBehavior2.onDragStartObservable.add((event) => {
    console.log("dragStart");
    console.log(event);
  });
  pointerDragBehavior2.onDragObservable.add((event) => {
    console.log("drag");
    console.log(box1.position);
  });
  pointerDragBehavior2.onDragEndObservable.add((event) => {
    console.log("dragEnd");
    console.log(event);
    box2.position.y = 1;
  });
  box2 = box1.clone("box2");
  box2.addBehavior(pointerDragBehavior2);

  // Our built-in 'ground' shape.
  MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
};

/**
 * Will run on every frame render.  We are spinning the box on y-axis.
 */
const onRender = (scene: Scene) => {
  if (box1 !== undefined) {
    const deltaTimeInMillis = scene.getEngine().getDeltaTime();

    const rpm = 10;
    //box1.rotation.y += (rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000);
  }
};

function App() {
  return (
    <div className="App">
      <h3>Babylon Sample</h3>
      <SceneComponent
        antialias
        onSceneReady={onSceneReady}
        onRender={onRender}
        id="my-canvas"
      />
    </div>
  );
}

export default App;
