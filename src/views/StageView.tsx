import "../App.css";
import { v4 as uuid } from "uuid";
import * as GUI from "@babylonjs/gui/2D";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import SceneComponent from "babylonjs-hook";
import { MeshData } from "../models/MeshData";
import {
  IRepositoryService,
  LocalStorageRepositoryService,
} from "../services/RepositoryService";
import { LiveShareClient } from "@microsoft/live-share";
import { LiveShareHost, app } from "@microsoft/teams-js";
import { useEffect, useState } from "react";
import {
  ContainerSchema,
  IFluidContainer,
  IValueChanged,
  SharedMap,
} from "fluid-framework";
import { LiveCanvas } from "@microsoft/live-share-canvas";
import { CreateButton } from "../services/GUIService";
import { Inspector } from "@babylonjs/inspector";

// ... YOUR SCENE CREATION
export const StageView = (): JSX.Element => {
  const [container, setContainer] = useState<IFluidContainer>();
  const containerSchema: ContainerSchema = {
    initialObjects: {
      liveCanvas: LiveCanvas,
      meshSharedMap: SharedMap,
      objName: SharedMap,
      cameraObj: SharedMap,
    },
  };

  const repository: IRepositoryService = new LocalStorageRepositoryService();
  let meshDataList: MeshData[] = []; // keep the partial mesh data in the memory.
  let ground: BABYLON.GroundMesh;
  let camera: BABYLON.ArcRotateCamera;
  let hl: BABYLON.HighlightLayer;
  let canvas: BABYLON.Nullable<HTMLCanvasElement>;
  let currentMesh: BABYLON.Nullable<BABYLON.AbstractMesh> = null; // selected mesh
  let removeButton: GUI.Button;
  let memoButton: GUI.Button;
  let closeMemoButton: GUI.Button;
  let memoInput: GUI.InputText;
  let meshSharedMap: SharedMap;

  useEffect(() => {
    const initTeams = async () => {
      await app.initialize();
      app.notifySuccess();
    };
    initTeams().then((item) => {
      const host = LiveShareHost.create();
      const client = new LiveShareClient(host);
      const getContainer = async () => {
        return await client.joinContainer(containerSchema);
      };
      getContainer().then((item) => {
        setContainer(item.container);
      });
    });
  });

  const onSceneReady = (scene: BABYLON.Scene) => {
    // Setup SharedMap change event.
    meshSharedMap = container!.initialObjects.meshSharedMap as SharedMap;
    meshSharedMap.on("valueChanged", (changed, local) => {
      if (!local) {
        SyncMesh(scene, changed, meshSharedMap);
      }
    });
    // Uncomment the following to show the BabylonJS Inspector.
    //Inspector.Show(scene, {});

    hl = new BABYLON.HighlightLayer("hl1", scene); // Create Highlight Layer to show which mesh is selected.
    camera = new BABYLON.ArcRotateCamera(
      "camera1",
      Math.PI / 2,
      Math.PI / 3,
      20,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.wheelPrecision = 50;
    canvas = scene.getEngine().getRenderingCanvas();
    camera.attachControl(canvas, true);
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
    // load the initial data if not yet.
    if (meshDataList.length === 0) {
      meshDataList = repository.getData("meshes");
    }

    // Load the meshes to the scene
    meshDataList?.map((meshData: MeshData) => {
      return CreateMeshAsync(scene, meshData);
    });
    // Adding buttons to the scene
    AddUIControl(scene);
    // Setup mouse control behaviors
    SetupPointerBehavior(scene);
    SetupMouseWheelBehavior(scene);
  };

  const onRender = (scene: BABYLON.Scene) => {};

  // Create a mesh and update list and repository data.
  async function CreateMeshAndUpateRepoAsync(
    scene: BABYLON.Scene,
    meshData: MeshData
  ) {
    await CreateMeshAsync(scene, meshData);
    // After creating a mesh, update the list and repository data.
    meshDataList.push(meshData);
    repository.setData("meshes", meshDataList);
  }

  // Create a mesh from the glb file and the initial values
  async function CreateMeshAsync(scene: BABYLON.Scene, meshData: MeshData) {
    // Getting the mesh from the glb file and take the second mesh as it's model.
    // This may vary depending on the model types.
    let mesh = (
      await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "https://raw.githubusercontent.com/kenakamu/hack23_metaverse_pub/main/src/data/",
        `${meshData.type}.glb`,
        scene,
        (meshes) => {}
      )
    ).meshes[1];
    mesh.parent = null;
    // Set mesh name, inital location and rotation.
    mesh.scaling = new BABYLON.Vector3(
      meshData.scale.x,
      meshData.scale.y,
      meshData.scale.z
    );
    mesh.rotate(BABYLON.Axis.Y, meshData.rotation.y, BABYLON.Space.WORLD);
    mesh.position = new BABYLON.Vector3(
      meshData.position.x,
      meshData.position.y,
      meshData.position.z
    );
    mesh.name = meshData.name;

    let pointerDragBehavior = new BABYLON.PointerDragBehavior({
      dragPlaneNormal: new BABYLON.Vector3(0, 1, 0), // meshes should be draggable for X and Z axies only.
    });
    pointerDragBehavior.onDragObservable.add((event) => {
      // propagete the position change to other clients
      meshSharedMap.set(`move_${currentMesh!.name}`, {
        name: currentMesh!.name,
        x: currentMesh!.position.x,
        z: currentMesh!.position.z,
      });
    });
    pointerDragBehavior.onDragEndObservable.add((event) => {
      // When the drag ends, we save it's location.
      meshDataList.some((mesh: MeshData) => {
        if (mesh.name === currentMesh!.name) {
          mesh.position.x = currentMesh!.position.x;
          mesh.position.y = currentMesh!.position.y;
          mesh.position.z = currentMesh!.position.z;
          repository.setData("meshes", meshDataList);
          return true;
        }
      });
      // propagete the position change to other clients
      meshSharedMap.set(`move_${currentMesh!.name}`, {
        name: currentMesh!.name,
        x: currentMesh!.position.x,
        z: currentMesh!.position.z,
      });
    });

    mesh.addBehavior(pointerDragBehavior);

    return mesh;
  }

  function SyncMesh(
    scene: BABYLON.Scene,
    changed: IValueChanged,
    meshSharedMap: SharedMap
  ) {
    if (changed.key.startsWith("add")) {
      CreateMeshAndUpateRepoAsync(
        scene,
        meshSharedMap.get(changed.key) as MeshData
      );
    } else if (changed.key.startsWith("remove")) {
      meshDataList.some((mesh: any, index: number) => {
        if (mesh.name === (meshSharedMap.get(changed.key) as string)) {
          meshDataList.splice(index, 1);
          repository.setData("meshes", meshDataList);
          let removedMesh = scene.getMeshByName(
            meshSharedMap.get(changed.key) as string
          );
          removedMesh?.dispose();
          if (currentMesh && removedMesh!.name === currentMesh.name) {
            removeButton.isVisible =
              memoButton.isVisible =
              closeMemoButton.isVisible =
              memoInput.isVisible =
                false;
          }
          return true;
        }
      });
    } else if (changed.key.startsWith("memo")) {
      let meshData = meshDataList.find(
        (meshData: MeshData) =>
          meshSharedMap.get(changed.key).name === meshData.name
      );
      meshData!.memo = meshSharedMap.get(changed.key).memo;
    } else if (changed.key.startsWith("move")) {
      let meshData = meshDataList.find(
        (meshData: MeshData) =>
          meshSharedMap.get(changed.key).name === meshData.name
      );
      meshData!.position.x = meshSharedMap.get(changed.key).x;
      meshData!.position.z = meshSharedMap.get(changed.key).z;
      let mesh = scene.getMeshByName(meshSharedMap.get(changed.key).name);
      mesh!.position.x = meshSharedMap.get(changed.key).x;
      mesh!.position.z = meshSharedMap.get(changed.key).z;
    } else if (changed.key.startsWith("rotate")) {
      console.log(
        "rotateevent",
        meshSharedMap.get(changed.key).name,
        ",",
        meshSharedMap.get(changed.key).y
      );
      let meshData = meshDataList.find(
        (meshData: MeshData) =>
          meshSharedMap.get(changed.key).name === meshData.name
      );
      meshData!.rotation.y = meshSharedMap.get(changed.key).y;
      let mesh = scene.getMeshByName(meshSharedMap.get(changed.key).name);
      mesh!.rotation.y = meshSharedMap.get(changed.key).y;
    }
  }

  // Add buttons.
  function AddUIControl(scene: BABYLON.Scene) {
    const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    // Add table button
    const addTableButton = CreateButton("addTableButton", "Add Table", {
      top: 10,
      left: 10,
    });
    addTableButton.onPointerClickObservable.add(() => {
      let name = uuid();
      let newMesh = new MeshData(
        name,
        "table",
        { x: 0, y: 0, z: 0 }, // position
        { x: 2, y: 2, z: 2 }, // scale
        { x: 0, y: 0, z: 0 }, // rotation
        "This is table-" + name
      );

      // After creating a mesh, update the list and repository data.
      CreateMeshAndUpateRepoAsync(scene, newMesh);
      // propagate the change to other clients
      meshSharedMap.set(`add_${newMesh.name}`, newMesh);
    });

    // Add chair button
    const addChiarButton = CreateButton("addChiarButton", "Add Chair", {
      top: 30,
      left: 10,
    });
    addChiarButton.onPointerClickObservable.add(() => {
      let name = uuid();
      let newMesh = new MeshData(
        name,
        "chair",
        { x: 0, y: 0, z: 0 }, // position
        { x: 2, y: 2, z: 2 }, // scale
        { x: 0, y: 0, z: 0 }, // rotation
        "This is chair-" + name
      );
      // After creating a mesh, update the list and repository data.
      CreateMeshAndUpateRepoAsync(scene, newMesh);
      // propagate the change to other clients
      meshSharedMap.set(`add_${newMesh.name}`, newMesh);
    });

    // Remove Button
    removeButton = CreateButton("removeButton", "Remove");
    removeButton.width = "50px";
    removeButton.isVisible = false;
    removeButton.onPointerClickObservable.add(() => {
      currentMesh?.dispose();
      removeButton.isVisible =
        memoButton.isVisible =
        closeMemoButton.isVisible =
        memoInput.isVisible =
          false;
      meshDataList.some((mesh: any, index: number) => {
        if (mesh.name === currentMesh!.name) {
          meshSharedMap.set(`remove_${mesh.name}`, mesh.name);
          meshDataList.splice(index, 1);
          repository.setData("meshes", meshDataList);
          return true;
        }
      });
    });

    // Create Memo Buttom
    memoButton = CreateButton("memoButton", "Memo");
    memoButton.width = "50px";
    memoButton.isVisible = false;
    memoButton.onPointerClickObservable.add(() => {
      memoInput.isVisible = true;
      closeMemoButton.isVisible = true;
    });

    // Create Memo Buttom
    closeMemoButton = CreateButton("closeMemoButton", "Close");
    closeMemoButton.width = "50px";
    closeMemoButton.isVisible = false;
    closeMemoButton.onPointerClickObservable.add(() => {
      memoInput.isVisible = false;
      closeMemoButton.isVisible = false;
    });

    // Memo Input Text Field
    memoInput = new GUI.InputTextArea();
    memoInput.width = "200px";
    memoInput.height = "80%";
    memoInput.isVisible = false;
    memoInput.background = "lightgray";
    memoInput.focusedBackground = "white";
    memoInput.color = "black";
    memoInput.onBlurObservable.add((value) => {
      meshDataList.some((mesh: any) => {
        if (mesh.name === currentMesh!.name) {
          mesh.memo = value.text;
          repository.setData("meshes", meshDataList);
          meshSharedMap.set(`memo_${mesh.name}`, {
            name: mesh.name,
            memo: value.text,
          });
          return true;
        }
      });
    });
    advancedTexture.addControl(addTableButton);
    advancedTexture.addControl(addChiarButton);
    advancedTexture.addControl(removeButton);
    advancedTexture.addControl(memoButton);
    advancedTexture.addControl(closeMemoButton);
    advancedTexture.addControl(memoInput);
  }

  // Setup mouse control behaviors when selecting a mesh or ground.
  function SetupPointerBehavior(scene: BABYLON.Scene) {
    let startingPoint: BABYLON.Nullable<BABYLON.Vector3>;
    let getGroundPosition = () => {
      let pickinfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
        return mesh === ground;
      });
      if (pickinfo.hit) {
        return pickinfo.pickedPoint;
      }

      return null;
    };

    // When selecting a mesh.
    let pointerDownOnMesh = (mesh: BABYLON.Nullable<BABYLON.AbstractMesh>) => {
      camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
      hl.removeAllMeshes();
      hl.addMesh(mesh as BABYLON.Mesh, BABYLON.Color3.Green());
      currentMesh = mesh;
      removeButton.linkWithMesh(currentMesh as BABYLON.Mesh);
      removeButton.linkOffsetX = 50;
      removeButton.linkOffsetY = -20;
      removeButton.isVisible = true;
      memoButton.linkWithMesh(currentMesh as BABYLON.Mesh);
      memoButton.linkOffsetX = 50;
      memoButton.linkOffsetY = 0;
      memoButton.isVisible = true;
      closeMemoButton.linkWithMesh(currentMesh as BABYLON.Mesh);
      closeMemoButton.linkOffsetX = 50;
      closeMemoButton.linkOffsetY = 0;
      closeMemoButton.isVisible = false;
      memoInput.linkWithMesh(currentMesh as BABYLON.Mesh);
      memoInput.linkOffsetX = 200;
      memoInput.isVisible = false;
      meshDataList.some((mesh: any) => {
        if (mesh.name === currentMesh!.name) {
          memoInput.text = mesh.memo;
          return true;
        }
      });

      startingPoint = getGroundPosition();
      if (startingPoint) {
        setTimeout(() => {
          camera.detachControl();
        }, 0);
      }
    };

    // When selecting the ground.
    let pointerDownOnGround = () => {
      hl.removeAllMeshes();
      currentMesh = null;
      camera.inputs.addMouseWheel();
      removeButton.isVisible = false;
      memoButton.isVisible = false;
      closeMemoButton.isVisible = false;
      memoInput.isVisible = false;
    };

    let pointerUp = () => {
      if (startingPoint) {
        camera.attachControl(canvas, true);
        startingPoint = null;
        return;
      }
    };

    let pointerMove = () => {
      if (!startingPoint) {
        return;
      }
      let current = getGroundPosition();
      if (!current) {
        return;
      }

      let diff = current.subtract(startingPoint);
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
        let delta = Math.sign(event.deltaY);
        //currentMesh.rotation.y += delta * 0.1;
        currentMesh.reIntegrateRotationIntoRotationQuaternion = true;
        (currentMesh as BABYLON.Mesh).rotate(
          BABYLON.Axis.Y,
          delta * 0.1,
          BABYLON.Space.WORLD
        );
        // rotationQuaternion is by default for glb
        currentMesh.rotation = currentMesh.rotationQuaternion!.toEulerAngles();
        meshDataList.some((mesh: any) => {
          if (mesh.name === currentMesh!.name) {
            mesh.rotation.y = currentMesh!.rotation.y;
            repository.setData("meshes", meshDataList);
            return true;
          }
        });
        meshSharedMap.set(`rotate_${currentMesh!.name}`, {
          name: currentMesh!.name,
          y: currentMesh!.rotation.y,
        });
      } else {
        camera.wheelPrecision = 50;
      }
    });
  }

  return (
    <div className="App">
      {container ? (
        <div>
          <SceneComponent
            antialias
            onSceneReady={onSceneReady}
            onRender={onRender}
            id="my-canvas"
          />
        </div>
      ) : (
        <div></div>
      )}
    </div>
  );
};
