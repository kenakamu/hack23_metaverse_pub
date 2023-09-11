import React from "react";
import "./App.css";
import { DataModel } from "./DataModel";
import * as GUI from "@babylonjs/gui/2D";
import {
  Nullable,
  ArcRotateCamera,
  PointerEventTypes,
  PointerInfo,
  FreeCamera,
  SceneLoader,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Mesh,
  Color3,
  PointerDragBehavior,
  AbstractMesh,
  GroundMesh,
  HighlightLayer,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import SceneComponent from "babylonjs-hook"; // if you install 'babylonjs-hook' NPM.
import "./App.css";
import * as tables from "./data/tables.json";

const dataList: DataModel[] = [];
var currentMesh: Nullable<AbstractMesh>;

const onSceneReady = (scene: Scene) => {
  const hl = new HighlightLayer("hl1", scene);
  // This creates and positions a free camera (non-mesh)
  const camera = new ArcRotateCamera(
    "camera1",
    0,
    0,
    0,
    new Vector3(0, 5, -20),
    scene
  );
  camera.wheelPrecision = 50;
  // This targets the camera to scene origin
  camera.setTarget(Vector3.Zero());

  const canvas = scene.getEngine().getRenderingCanvas();

  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);

  // read the initial data if not read yet.
  if (dataList.length === 0) {
    for (let table of Array.from(tables)) {
      dataList.push(
        new DataModel(
          table.type,
          table.name,
          table.position_x,
          table.position_y,
          table.position_z
        )
      );
    }
  }
  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  // Default intensity is 1. Let's dim the light a small amount
  light.intensity = 0.7;

  var ground: GroundMesh = MeshBuilder.CreateGround(
    "ground",
    { width: 20, height: 20 },
    scene
  );
  InitializeAsync(scene);
  AddUIControl(scene);

  var startingPoint: Nullable<Vector3>;
  var getGroundPosition = function () {
    var pickinfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) {
      return mesh == ground;
    });
    if (pickinfo.hit) {
      return pickinfo.pickedPoint;
    }

    return null;
  };

  var pointerDown = function (mesh: Nullable<AbstractMesh>) {
    hl.removeAllMeshes();
    hl.addMesh(mesh as Mesh, Color3.Green());
    currentMesh = mesh;
    startingPoint = getGroundPosition();
    if (startingPoint) {
      setTimeout(function () {
        camera.detachControl();
      }, 0);
    }
  };

  var pointerUp = function () {
    if (startingPoint) {
      camera.attachControl(canvas, true);
      startingPoint = null;
      return;
    }
  };

  var pointerMove = function () {
    if (!startingPoint) {
      return;
    }
    var current = getGroundPosition();
    if (!current) {
      return;
    }

    var diff = current.subtract(startingPoint);
    currentMesh!.position.addInPlace(diff);

    startingPoint = current;
  };

  scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN:
        if (
          pointerInfo.pickInfo!.hit &&
          pointerInfo.pickInfo!.pickedMesh != ground
        ) {
          pointerDown(pointerInfo.pickInfo!.pickedMesh);
        }
        break;
      case PointerEventTypes.POINTERUP:
        pointerUp();
        break;
      case PointerEventTypes.POINTERMOVE:
        pointerMove();
        break;
    }
  });
};

const onRender = (scene: Scene) => {
  // if (box1 !== undefined) {
  //   const deltaTimeInMillis = scene.getEngine().getDeltaTime();
  //   const rpm = 10;
  //   box1.rotation.y += (rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000);
  // }
};

function InitializeAsync(scene: Scene) {
  dataList.map((data: DataModel) => {
    if (data.type === "chair") {
      CreateChairAsync(
        scene,
        data.name,
        data.position_x,
        data.position_y,
        data.position_z
      );
    } else if (data.type === "table") {
      CreateTableAsync(
        scene,
        data.name,
        data.position_x,
        data.position_y,
        data.position_z
      );
    }
    return true;
  });
}

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

async function CreateChairAsync(
  scene: Scene,
  name: string,
  position_x: number,
  position_y: number,
  position_z: number
) {
  let chair = (
    await SceneLoader.ImportMeshAsync(
      "",
      "https://raw.githubusercontent.com/kenakamu/hack23_metaverse_pub/main/src/data/",
      "chair.glb",
      scene,
      function (meshes) {}
    )
  ).meshes;
  chair.map((mesh) => (mesh.scaling = new Vector3(2, 2, 2)));
  chair.map((mesh) => (mesh.rotation.y = -Math.PI));
  chair.map(
    (mesh) => (mesh.position = new Vector3(position_x, position_y, position_z))
  );
  chair.map((mesh) => (mesh.name = name));

  var pointerDragBehavior1 = new PointerDragBehavior({
    dragPlaneNormal: new Vector3(0, 1, 0),
  });
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
  chair.map((mesh) => mesh.addBehavior(pointerDragBehavior1));

  return chair;
}

async function CreateTableAsync(
  scene: Scene,
  name: string,
  position_x: number,
  position_y: number,
  position_z: number
) {
  let table = (
    await SceneLoader.ImportMeshAsync(
      "",
      "https://raw.githubusercontent.com/kenakamu/hack23_metaverse_pub/main/src/data/",
      "table.glb",
      scene,
      function (meshes) {}
    )
  ).meshes;
  table.map((mesh) => (mesh.scaling = new Vector3(2, 2, 2)));
  table.map((mesh) => (mesh.rotation.y = -Math.PI));
  table.map(
    (mesh) => (mesh.position = new Vector3(position_x, position_y, position_z))
  );

  var pointerDragBehavior1 = new PointerDragBehavior({
    dragPlaneNormal: new Vector3(0, 1, 0),
  });
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
  table.map((mesh) => mesh.addBehavior(pointerDragBehavior1));
  table.map((mesh) => (mesh.name = name));
  return table;
}

function AddUIControl(scene: Scene) {
  const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  const addTableButton = GUI.Button.CreateSimpleButton(
    "addTableButton",
    "Add Table"
  );
  addTableButton.width = "100px";
  addTableButton.height = "20px";
  addTableButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  addTableButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  addTableButton.color = "white";
  addTableButton.background = "blue";
  addTableButton.fontSize = 12;
  addTableButton.top = "10px";
  addTableButton.left = "10px";
  addTableButton.onPointerClickObservable.add(function () {
    CreateTableAsync(scene, "table", 0, 0, 0);
  });

  const addChiarButton = GUI.Button.CreateSimpleButton(
    "addChiarButton",
    "Add Chair"
  );  
  addChiarButton.width = "100px";
  addChiarButton.height = "20px";
  addChiarButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  addChiarButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  addChiarButton.color = "white";
  addChiarButton.background = "blue";
  addChiarButton.fontSize = 12;
  addChiarButton.top = "30px";
  addChiarButton.left = "10px";
  addChiarButton.onPointerClickObservable.add(function () {
    CreateChairAsync(scene, "table", 0, 0, 0);
  });

  const removeButton = GUI.Button.CreateSimpleButton(
    "removeButton",
    "Remove"
  );
  
  removeButton.width = "100px";
  removeButton.height = "20px";
  removeButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  removeButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  removeButton.color = "white";
  removeButton.background = "blue";
  removeButton.fontSize = 12;
  removeButton.top = "50px";
  removeButton.left = "10px";
  removeButton.onPointerClickObservable.add(function () {
    currentMesh?.dispose();
  });

  advancedTexture.addControl(addTableButton);
  advancedTexture.addControl(addChiarButton);
  advancedTexture.addControl(removeButton);
}
export default App;
