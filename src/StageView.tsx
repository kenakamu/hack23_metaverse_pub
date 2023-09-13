import React, { memo } from "react";
import { v4 as uuid } from "uuid";
import "./App.css";
import { MeshDataModel } from "./MeshDataModel";
import * as GUI from "@babylonjs/gui/2D";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import SceneComponent from "babylonjs-hook";
import "./App.css";
import { Inspector } from "@babylonjs/inspector";

// ... YOUR SCENE CREATION
export const StageView = (): JSX.Element => {
  const dataList: MeshDataModel[] = [];
  let ground: BABYLON.GroundMesh;
  let currentMesh: BABYLON.Nullable<BABYLON.AbstractMesh> = null;
  let camera: BABYLON.ArcRotateCamera;
  let hl: BABYLON.HighlightLayer;
  let canvas: BABYLON.Nullable<HTMLCanvasElement>;
  let removeButton: GUI.Button;
  let memoInput: GUI.InputText;
  let meshesData: any = [];
  const onSceneReady = (scene: BABYLON.Scene) => {
    //Inspector.Show(scene, {});
    // Create Highlight Layer to show which mesh is selected
    hl = new BABYLON.HighlightLayer("hl1", scene);
    camera = new BABYLON.ArcRotateCamera(
      "camera1",
      Math.PI / 2,
      Math.PI / 3,
      20,
      new BABYLON.Vector3(0, 0, 0),
      scene
    );
    camera.wheelPrecision = 50;
    canvas = scene.getEngine().getRenderingCanvas();
    camera.attachControl(canvas, true);

    // load the initial data if not yet.
    if (dataList.length === 0) {
      var meshesJson = getData("meshes");
      if (meshesJson === null) {
        meshesJson = "[]";
      }

      meshesData = JSON.parse(meshesJson!);
      for (let mesh of meshesData) {
        dataList.push(
          new MeshDataModel(
            mesh.type,
            mesh.name,
            mesh.position_x,
            mesh.position_y,
            mesh.position_z,
            mesh.rotation_y
          )
        );
      }
    }
    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    light.intensity = 0.7;
    ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 20, height: 20 },
      scene
    );

    // Load the meshes to the scene
    dataList.map((data: MeshDataModel) => {
      CreateMeshAsync(
        scene,
        data.type,
        data.name,
        data.position_x,
        data.position_y,
        data.position_z,
        data.rotation_y
      );
      return true;
    });

    // Adding buttons to the scene
    AddUIControl(scene);
    // Setup mouse control behaviors
    SetupPointerBehavior(scene);
    SetupMouseWheelBehavior(scene);
  };

  const onRender = (scene: BABYLON.Scene) => {};

  // Create a mesh from the glb file and the inital values
  async function CreateMeshAsync(
    scene: BABYLON.Scene,
    type: string,
    name: string,
    position_x: number,
    position_y: number,
    position_z: number,
    rotation_y: number
  ) {
    // Getting the mesh from the glb file and take the second mesh as it's model.
    // This may vary depending on the model types.
    let mesh = (
      await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "https://raw.githubusercontent.com/kenakamu/hack23_metaverse_pub/main/src/data/",
        `${type}.glb`,
        scene,
        (meshes) => {}
      )
    ).meshes[1];
    mesh.parent = null;
    mesh.scaling = new BABYLON.Vector3(2, 2, 2);
    mesh.rotate(BABYLON.Axis.Y, rotation_y, BABYLON.Space.WORLD);
    mesh.position = new BABYLON.Vector3(position_x, position_y, position_z);
    mesh.name = name;

    var pointerDragBehavior1 = new BABYLON.PointerDragBehavior({
      dragPlaneNormal: new BABYLON.Vector3(0, 1, 0),
    });
    pointerDragBehavior1.onDragStartObservable.add((event) => {
    });
    pointerDragBehavior1.onDragObservable.add((event) => {
    });
    pointerDragBehavior1.onDragEndObservable.add((event) => {
      // When the drag ends, we save it's location.
      dataList.some((mesh: any) => {
        if (mesh.name === currentMesh!.name) {
          mesh.position_x = currentMesh!.position.x;
          mesh.position_y = currentMesh!.position.y;
          mesh.position_z = currentMesh!.position.z;
          mesh.rotation_y = currentMesh!.rotation.y;
          setData("meshes", dataList);
          return true;
        }
      });
    });

    mesh.addBehavior(pointerDragBehavior1);

    return mesh;
  }

  // Add buttons.
  function AddUIControl(scene: BABYLON.Scene) {
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
    addTableButton.onPointerClickObservable.add(() => {
      var id = uuid();
      CreateMeshAsync(scene, "table", id, 0, 0, 0, 0);
      dataList.push(new MeshDataModel("table", id, 0, 0, 0, 0));
      setData("meshes", dataList);
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
    addChiarButton.onPointerClickObservable.add(() => {
      var id = uuid();
      CreateMeshAsync(scene, "chair", id, 0, 0, 0, 0);
      dataList.push(new MeshDataModel("chair", id, 0, 0, 0, 0));
      setData("meshes", dataList);
    });

    removeButton = GUI.Button.CreateSimpleButton("removeButton", "Remove");
    removeButton.width = "50px";
    removeButton.height = "20px";
    removeButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    removeButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    removeButton.color = "white";
    removeButton.background = "blue";
    removeButton.fontSize = 12;
    removeButton.isVisible = false;
    removeButton.onPointerClickObservable.add(() => {
      currentMesh?.dispose();
      removeButton.isVisible = false;
      dataList.some((mesh: any, index: number) => {
        if (mesh.name === currentMesh!.name) {
          dataList.splice(index, 1);
          setData("meshes", dataList);
          return true;
        }
      });
    });

    memoInput = new GUI.InputTextArea();
    memoInput.width = "200px";
    memoInput.height = "80%";
    memoInput.isVisible = false;
    memoInput.background = "lightgray";
    memoInput.focusedBackground = "white";
    memoInput.color = "black";
    memoInput.onTextChangedObservable.add((value) => {
    });
    memoInput.onBlurObservable.add((value) => {
      dataList.some((mesh: any) => {
        if (mesh.name === currentMesh!.name) {
          mesh.position_x = currentMesh!.position.x;
          mesh.position_y = currentMesh!.position.y;
          mesh.position_z = currentMesh!.position.z;
          mesh.rotation_y = currentMesh!.rotation.y;
          mesh.memo = value.text;
          setData("meshes", dataList);
          return true;
        }
      });
    });
    advancedTexture.addControl(addTableButton);
    advancedTexture.addControl(addChiarButton);
    advancedTexture.addControl(removeButton);
    advancedTexture.addControl(memoInput);
  }

  // Setup mouse control behaviors when selecting a mesh or ground.
  function SetupPointerBehavior(scene: BABYLON.Scene) {
    var startingPoint: BABYLON.Nullable<BABYLON.Vector3>;
    var getGroundPosition = () => {
      var pickinfo = scene.pick(
        scene.pointerX,
        scene.pointerY,
        (mesh) => {
          return mesh === ground;
        }
      );
      if (pickinfo.hit) {
        return pickinfo.pickedPoint;
      }

      return null;
    };

    // When selecitng a mesh.
    var pointerDownOnMesh = (
      mesh: BABYLON.Nullable<BABYLON.AbstractMesh>
    ) => {
      hl.removeAllMeshes();
      hl.addMesh(mesh as BABYLON.Mesh, BABYLON.Color3.Green());
      currentMesh = mesh;
      removeButton.linkWithMesh(currentMesh as BABYLON.Mesh);
      removeButton.linkOffsetX = 50;
      removeButton.linkOffsetY = -20;
      removeButton.isVisible = true;
      memoInput.linkWithMesh(currentMesh as BABYLON.Mesh);
      memoInput.linkOffsetX = 150;
      memoInput.linkOffsetY = -100;
      memoInput.isVisible = true;
      startingPoint = getGroundPosition();
      if (startingPoint) {
        setTimeout(() => {
          camera.detachControl();
        }, 0);
      }
    };

    // When selecting the ground.
    var pointerDownOnGround = () => {
      hl.removeAllMeshes();
      currentMesh = null;
      camera.inputs.addMouseWheel();
      removeButton.linkWithMesh(null);
      removeButton.isVisible = false;
    };

    var pointerUp = () => {
      if (startingPoint) {
        camera.attachControl(canvas, true);
        startingPoint = null;
        return;
      }
    };

    var pointerMove = () => {
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

    scene.onPointerObservable.add((pointerInfo: BABYLON.PointerInfo) => {
      switch (pointerInfo.type) {
        case BABYLON.PointerEventTypes.POINTERDOWN:
          if (
            pointerInfo.pickInfo!.hit &&
            pointerInfo.pickInfo!.pickedMesh !== ground
          ) {
            pointerDownOnMesh(pointerInfo.pickInfo!.pickedMesh);
          } else {
            pointerDownOnGround();
          }
          break;
        case BABYLON.PointerEventTypes.POINTERUP:
          pointerUp();
          break;
        case BABYLON.PointerEventTypes.POINTERMOVE:
          pointerMove();
          break;
      }
    });
  }

  // Setup mouse wheel behavior for camera and the selected mesh.
  function SetupMouseWheelBehavior(scene: BABYLON.Scene) {
    window.addEventListener("wheel", (event) => {
      if (currentMesh !== null) {
        camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
        var delta = Math.sign(event.deltaY);
        //currentMesh.rotation.y += delta * 0.1;
        currentMesh.reIntegrateRotationIntoRotationQuaternion = true;
        (currentMesh as BABYLON.Mesh).rotate(
          BABYLON.Axis.Y,
          delta * 0.1,
          BABYLON.Space.WORLD
        );
        // rotationQuaternion is by default for glb
        currentMesh.rotation = currentMesh.rotationQuaternion!.toEulerAngles();
        dataList.some((mesh: any) => {
          if (mesh.name === currentMesh!.name) {
            mesh.position_x = currentMesh!.position.x;
            mesh.position_y = currentMesh!.position.y;
            mesh.position_z = currentMesh!.position.z;
            mesh.rotation_y = currentMesh!.rotation.y;
            setData("meshes", dataList);
            return true;
          }
        });
      } else {
        camera.wheelPrecision = 50;
      }
    });
  }

  function setData(key: string, dataList: MeshDataModel[]){
    localStorage.setItem(key, JSON.stringify(dataList));
  }

  function getData(key: string) : string | null{
    return localStorage.getItem(key);
  }

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
};
