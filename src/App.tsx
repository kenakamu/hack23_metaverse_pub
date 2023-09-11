import React from "react";
import "./App.css";
import {TableModel} from './TableModel';
import {
  ArcRotateCamera,
  FreeCamera,
  SceneLoader,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Mesh,
  PointerDragBehavior,
  AbstractMesh,
} from "@babylonjs/core";
import '@babylonjs/loaders/glTF/2.0/glTFLoader'
import SceneComponent from "babylonjs-hook"; // if you install 'babylonjs-hook' NPM.
import "./App.css";
import * as tables  from './data/tables.json';

const tableList: TableModel[] = [];
const onSceneReady = (scene: Scene) => {
  // This creates and positions a free camera (non-mesh)
  const camera = new ArcRotateCamera("camera1",0,0,0, new Vector3(0, 5, -20), scene);
  camera.wheelPrecision = 50;
  // This targets the camera to scene origin
  camera.setTarget(Vector3.Zero());

  const canvas = scene.getEngine().getRenderingCanvas();

  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);

  // SceneLoader.ImportMesh("", "https://raw.githubusercontent.com/kenakamu/hack23_metaverse_pub/main/src/data/", "chair.glb", scene, function (meshes) {          
  //  // scene.createDefaultCameraOrLight(true, true, true);
  //   scene.createDefaultEnvironment();    
  //   // meshes.map((mesh)=> mesh.scaling = new Vector3(0.04, 0.04, 0.04));
  //   // meshes.map((mesh)=> mesh.rotation.y = -Math.PI);
  // });
  
  if (tableList.length === 0){
    for (let table of Array.from(tables)){
      tableList.push(new TableModel(table.name, table.position_x, table.position_y, table.position_z));
    };
  }
  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

  // Default intensity is 1. Let's dim the light a small amount
  light.intensity = 0.7;

  // tableList.map((table: TableModel) => { CreateBox(scene, table.name)});
  tableList.map((table: TableModel) => { CreateChairAsync(scene, table.name, table.position_x, table.position_y, table.position_z)});
  tableList.map((table: TableModel) => { CreateTableAsync(scene, table.name, table.position_x, table.position_y, table.position_z)});
  MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
};

const onRender = (scene: Scene) => {
  // if (box1 !== undefined) {
  //   const deltaTimeInMillis = scene.getEngine().getDeltaTime();

  //   const rpm = 10;
  //   box1.rotation.y += (rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000);
  // }
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

async function CreateChairAsync(scene: Scene, name: string, position_x: number, position_y: number, position_z: number){
  
  let chair = (await SceneLoader.ImportMeshAsync(
    "", 
    "https://raw.githubusercontent.com/kenakamu/hack23_metaverse_pub/main/src/data/", 
    "chair.glb",
     scene, function (meshes) {          
  })).meshes;
  chair.map((mesh)=> mesh.scaling = new Vector3(2,2,2));
  chair.map((mesh)=> mesh.rotation.y = -Math.PI);
  chair.map((mesh)=> mesh.position = new Vector3(position_x, position_y, position_z));
  
  var pointerDragBehavior1 = new PointerDragBehavior({
    dragPlaneNormal: new Vector3(0, 1, 0),});
    pointerDragBehavior1.onDragStartObservable.add((event) => {
     console.log("dragStart");
     console.log(event);
  });
  pointerDragBehavior1.onDragObservable.add((event) => {
    console.log("drag");
    console.log(event);
  });
  pointerDragBehavior1.onDragEndObservable.add((event) => {
    console.log("dragEnd");
    console.log(event);
  });
  chair.map((mesh)=> mesh.addBehavior(pointerDragBehavior1));
  // box.position.y = 1;
  
  return chair;
}

async function CreateTableAsync(scene: Scene, name: string, position_x: number, position_y: number, position_z: number){
  
  let table = (await SceneLoader.ImportMeshAsync(
    "", 
    "https://raw.githubusercontent.com/kenakamu/hack23_metaverse_pub/main/src/data/", 
    "table.glb",
     scene, function (meshes) {          
  })).meshes;
  table.map((mesh)=> mesh.scaling = new Vector3(2,2,2));
  table.map((mesh)=> mesh.rotation.y = -Math.PI);
  table.map((mesh)=> mesh.position = new Vector3(position_x, position_y, position_z));
  
  var pointerDragBehavior1 = new PointerDragBehavior({
    dragPlaneNormal: new Vector3(0, 1, 0),});
    pointerDragBehavior1.onDragStartObservable.add((event) => {
     console.log("dragStart");
     console.log(event);
  });
  pointerDragBehavior1.onDragObservable.add((event) => {
    console.log("drag");
    console.log(event);
  });
  pointerDragBehavior1.onDragEndObservable.add((event) => {
    console.log("dragEnd");
    console.log(event);
  });
  table.map((mesh)=> mesh.addBehavior(pointerDragBehavior1));
  // box.position.y = 1;
  
  return table;
}

export default App;
