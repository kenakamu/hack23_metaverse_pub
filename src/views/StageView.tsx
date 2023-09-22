import "../App.css";
import { useEffect, useState, useRef } from "react";
import { v4 as uuid } from "uuid";
import * as GUI from "@babylonjs/gui/2D";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import SceneComponent from "babylonjs-hook";
import { LiveShareHost, app } from "@microsoft/teams-js";
import { ILiveShareJoinResults, LiveShareClient, TestLiveShareHost } from "@microsoft/live-share";
import { ContainerSchema, IFluidContainer, IValueChanged, SharedMap, } from "fluid-framework";
import { IRepositoryService, LocalStorageRepositoryService, } from "../services/RepositoryService";
import { CreateStage, CreateButton, CreateInput } from "../services/BabylonHelper";
import { MeshData } from "../models/MeshData";
import { DragInfo, RotateInfo, SyncActionType } from "../models/SyncInfo";
import { Inspector } from "@babylonjs/inspector";

const glbImageSource: string = "https://raw.githubusercontent.com/kenakamu/hack23_metaverse_pub/main/src/data/";
const inTeams = new URL(window.location.href).searchParams.get("inTeams") === "1";

export const StageView = (): JSX.Element => {
  const [container, setContainer] = useState<IFluidContainer>();
  const containerSchema: ContainerSchema = {
    initialObjects: {
      meshSharedMap: SharedMap
    },
  };
  const initializeStartedRef = useRef(false);
  const repository: IRepositoryService = new LocalStorageRepositoryService();
  let meshDataList: MeshData[] = []; // Store mesh data for the repository
  let camera: BABYLON.ArcRotateCamera;
  let highlight: BABYLON.HighlightLayer;
  let ground: BABYLON.GroundMesh;
  let canvas: BABYLON.Nullable<HTMLCanvasElement>;
  let currentMesh: BABYLON.Nullable<BABYLON.AbstractMesh> = null;
  let removeButton: GUI.Button;
  let memoButton: GUI.Button;
  let closeMemoButton: GUI.Button;
  let memoInput: GUI.InputText;
  let meshSharedMap: SharedMap;

  useEffect(() => {
    if (initializeStartedRef.current) return;
    initializeStartedRef.current = true;
    const initialize = async () => {
      try {
        console.log("StageView.tsx: initializing client SDK initialized");
        await app.initialize();
        app.notifyAppLoaded();
        app.notifySuccess();
      } catch (error) {
        console.error(error);
      }
    };
    
    const joinContainer = async () => {
      const host = inTeams ? LiveShareHost.create() : TestLiveShareHost.create();
      const client = new LiveShareClient(host);
      let item: ILiveShareJoinResults = await client.joinContainer(containerSchema);
      setContainer(item.container);
    }

    console.log("StageView.tsx: initializing client SDK");
    if (inTeams) initialize();
    joinContainer();
  });

  const onSceneReady = (scene: BABYLON.Scene) => {
    // Uncomment the following to show the BabylonJS Inspector.
    //Inspector.Show(scene, {});

    const stage = CreateStage(scene);
    highlight = stage.highlight;
    camera = stage.camera;
    ground = stage.ground;
    canvas = stage.canvas;

    if (meshDataList.length === 0) meshDataList = repository.getData("meshes");
    meshDataList?.map((meshData: MeshData) => CreateMeshAsync(scene, meshData));

    AddUIControl(scene);
    SetupPointerBehavior(scene);
    SetupMouseWheelBehavior(scene);

    // setup meshSharedMap to synchronize between clients if in Teams.
    // if (inTeams) {
    meshSharedMap = container!.initialObjects.meshSharedMap as SharedMap;
    meshSharedMap.on("valueChanged", (changed: IValueChanged, local: boolean) => {
      if (!local) {
        SyncMesh(scene, changed, meshSharedMap);
      }
    });
    // }
  };

  const onRender = (scene: BABYLON.Scene) => {
  };

  // Create a mesh and update list and repository data.
  async function CreateMeshAndUpateRepoAsync(scene: BABYLON.Scene, meshData: MeshData) {
    await CreateMeshAsync(scene, meshData)
    meshDataList.push(meshData);
    repository.setData("meshes", meshDataList);
  }

  // Create a pointer drag behavior for the mesh.
  function GetPointerBehavior(): BABYLON.PointerDragBehavior {
    const pointerDragBehavior = new BABYLON.PointerDragBehavior({
      dragPlaneNormal: new BABYLON.Vector3(0, 1, 0), // meshes should be draggable for X and Z axies only.
    });

    pointerDragBehavior.onDragObservable.add((event) => {
      // propagete the position change to other clients
      PropagateChanes(
        `${SyncActionType.Drag}_${currentMesh!.name}`,
        new DragInfo(currentMesh!.name, currentMesh!.position.x, currentMesh!.position.z)
      );
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
        return true;
      });
      // propagete the position change to other clients
      PropagateChanes(
        `${SyncActionType.Drag}_${currentMesh!.name}`,
        new DragInfo(currentMesh!.name, currentMesh!.position.x, currentMesh!.position.z),
      );
    });
    return pointerDragBehavior;
  }

  // Create a mesh from the glb file and the initial values
  async function CreateMeshAsync(scene: BABYLON.Scene, meshData: MeshData) {
    // Getting the mesh from the glb file and take the second mesh as it's model (the first one is __root__)
    let mesh = (await BABYLON.SceneLoader.ImportMeshAsync("", glbImageSource, `${meshData.type}.glb`, scene)).meshes[1];
    mesh.name = meshData.name;
    mesh.parent = null;
    mesh.scaling = new BABYLON.Vector3(meshData.scale.x, meshData.scale.y, meshData.scale.z);
    mesh.position = new BABYLON.Vector3(meshData.position.x, meshData.position.y, meshData.position.z);
    mesh.reIntegrateRotationIntoRotationQuaternion = true;  // rotationQuaternion is by default for glb
    mesh.rotate(BABYLON.Axis.Y, meshData.rotation.y, BABYLON.Space.WORLD);
    mesh.rotation = mesh.rotationQuaternion!.toEulerAngles(); // Assign current rotation.
    mesh.addBehavior(GetPointerBehavior());

    return mesh;
  }

  // Sync mesh data between clients if in Teams.
  function SyncMesh(
    scene: BABYLON.Scene,
    changed: IValueChanged,
    meshSharedMap: SharedMap
  ) {
    // Sync mesh action between clients.
    if (changed.key.startsWith(SyncActionType.Add.toString())) {
      CreateMeshAndUpateRepoAsync(scene, meshSharedMap.get(changed.key) as MeshData);
    } else if (changed.key.startsWith(SyncActionType.Remove.toString())) {
      meshDataList.some((mesh: any, index: number) => {
        if (mesh.name === (meshSharedMap.get(changed.key) as string)) {
          meshDataList.splice(index, 1);
          repository.setData("meshes", meshDataList);
          let removedMesh = scene.getMeshByName(meshSharedMap.get(changed.key) as string);
          if (removedMesh !== null) {
            removedMesh.dispose();
            if (currentMesh && removedMesh.name === currentMesh.name) {
              removeButton.isVisible = memoButton.isVisible = closeMemoButton.isVisible = memoInput.isVisible = false;
            }
          }
          return true;
        }
        return true;
      });
    } else if (changed.key.startsWith(SyncActionType.UpdateMemo.toString())) {
      let meshData = meshDataList.find((meshData: MeshData) => meshSharedMap.get(changed.key).name === meshData.name);
      if (meshData !== undefined) meshData!.memo = meshSharedMap.get(changed.key).memo;
    } else if (changed.key.startsWith(SyncActionType.Drag.toString())) {
      let dragLocation: DragInfo = meshSharedMap.get(changed.key) as DragInfo;
      let meshData = meshDataList.find((meshData: MeshData) => meshSharedMap.get(changed.key).name === meshData.name);
      if (meshData !== undefined) {
        meshData!.position.x = dragLocation.x;
        meshData!.position.z = dragLocation.z;
      }
      let mesh = scene.getMeshByName(meshSharedMap.get(changed.key).name);
      if (mesh !== null) {
        mesh!.position.x = dragLocation.x;
        mesh!.position.z = dragLocation.z;
      }
    } else if (changed.key.startsWith(SyncActionType.Rotate.toString())) {
      let rotateInfo: RotateInfo = meshSharedMap.get(changed.key) as RotateInfo;
      let meshData = meshDataList.find((meshData: MeshData) => meshSharedMap.get(changed.key).name === meshData.name);
      if (meshData !== undefined) meshData!.rotation.y = rotateInfo.y;
      let mesh = scene.getMeshByName(meshSharedMap.get(changed.key).name);
      if (mesh !== null) mesh!.rotation.y = rotateInfo.y;
    }
  }

  // Propagate changes to other clients if in Teams.
  function PropagateChanes(key: string, value: any) {
    // if (!inTeams) return;
    meshSharedMap.set(key, value);
  }

  // Add Babylon GUI controls.
  function AddUIControl(scene: BABYLON.Scene) {
    const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Add table button
    const addTableButton = CreateButton("addTableButton", "Add Table", "100px", "20px", true, { top: "10px", left: "10px" });
    addTableButton.onPointerClickObservable.add(async () => {
      let name = uuid();
      let newMesh = new MeshData(
        name,
        "table",
        { x: 0, y: 0, z: 0 }, // position
        { x: 2, y: 2, z: 2 }, // scale
        { x: 0, y: 0, z: 0 }, // rotation
        "This is table-" + name
      );

      await CreateMeshAndUpateRepoAsync(scene, newMesh);
      PropagateChanes(`${SyncActionType.Add}_${newMesh.name}`, newMesh);
    });

    // Add chair button
    const addChiarButton = CreateButton("addChiarButton", "Add Chair", "100px", "20px", true, { top: "30px", left: "10px" });
    addChiarButton.onPointerClickObservable.add(async () => {
      let name = uuid();
      let newMesh = new MeshData(
        name,
        "chair",
        { x: 0, y: 0, z: 0 }, // position
        { x: 2, y: 2, z: 2 }, // scale
        { x: 0, y: 0, z: 0 }, // rotation
        "This is chair-" + name
      );
      await CreateMeshAndUpateRepoAsync(scene, newMesh);
      PropagateChanes(`${SyncActionType.Add}_${newMesh.name}`, newMesh);
    });

    // Remove All Button
    const removeAllButton = CreateButton("removeAllButton", "Remove All", "100px", "20px", true, { top: "50px", left: "10px" });
    removeAllButton.onPointerClickObservable.add(async () => {
      removeButton.isVisible = memoButton.isVisible = closeMemoButton.isVisible = memoInput.isVisible = false;
      meshDataList.forEach((meshData: MeshData) => {
        scene.getMeshByName(meshData.name)?.dispose();
        PropagateChanes(`${SyncActionType.Remove}_${meshData.name}`, meshData.name);
      });
      meshDataList = [];
      repository.setData("meshes", meshDataList);
    });

    // Remove Button
    removeButton = CreateButton("removeButton", "Remove", "50px", "20px", false, null, { x: 50, y: -20 });
    removeButton.onPointerClickObservable.add(() => {
      currentMesh?.dispose();
      removeButton.isVisible = memoButton.isVisible = closeMemoButton.isVisible = memoInput.isVisible = false;
      meshDataList.some((mesh: any, index: number) => {
        if (mesh.name === currentMesh!.name) {
          meshDataList.splice(index, 1);
          repository.setData("meshes", meshDataList);
          PropagateChanes(`${SyncActionType.Remove}_${mesh.name}`, mesh.name);
          return true;
        }
        return true;
      });
    });

    // Create Memo Buttom
    memoButton = CreateButton("memoButton", "Memo", "50px", "20px", false, null, { x: 50, y: 0 });
    memoButton.onPointerClickObservable.add(() => memoInput.isVisible = closeMemoButton.isVisible = true);

    // Create Memo Buttom
    closeMemoButton = CreateButton("closeMemoButton", "Close", "50px", "20px", false, null, { x: 50, y: 0 });
    closeMemoButton.onPointerClickObservable.add(() => memoInput.isVisible = closeMemoButton.isVisible = false);

    // Memo Input Text Field
    memoInput = CreateInput();
    memoInput.onBlurObservable.add((value) => {
      let meshData = meshDataList.find((meshData: MeshData) => meshData.name === currentMesh!.name);
      if (meshData !== undefined && meshData.name !== currentMesh!.name) {
        meshData.memo = value.text;
        repository.setData("meshes", meshDataList);
        PropagateChanes(`${SyncActionType.UpdateMemo}_${meshData.name}`, {
          name: meshData.name,
          memo: value.text,
        });
      }
    });

    advancedTexture.addControl(addTableButton);
    advancedTexture.addControl(addChiarButton);
    advancedTexture.addControl(removeAllButton);
    advancedTexture.addControl(removeButton);
    advancedTexture.addControl(memoButton);
    advancedTexture.addControl(closeMemoButton);
    advancedTexture.addControl(memoInput);
  }

  // Setup mouse control behaviors when selecting a mesh or ground.
  function SetupPointerBehavior(scene: BABYLON.Scene) {
    let startingPoint: BABYLON.Nullable<BABYLON.Vector3>;

    let getGroundPosition = () => {
      let pickinfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === ground);
      if (pickinfo.hit) return pickinfo.pickedPoint;
      return null;
    };

    let pointerDownOnMesh = (mesh: BABYLON.Nullable<BABYLON.AbstractMesh>) => {
      // When selecting a mesh, remove the mouse wheel behavior from the camera.
      camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
      highlight.removeAllMeshes();
      highlight.addMesh(mesh as BABYLON.Mesh, BABYLON.Color3.Green());
      currentMesh = mesh;
      removeButton.linkWithMesh(currentMesh as BABYLON.Mesh);
      memoButton.linkWithMesh(currentMesh as BABYLON.Mesh);
      closeMemoButton.linkWithMesh(currentMesh as BABYLON.Mesh);
      memoInput.linkWithMesh(currentMesh as BABYLON.Mesh);
      removeButton.isVisible = memoButton.isVisible = true;
      memoInput.isVisible = closeMemoButton.isVisible = false;
      let meshData = meshDataList.find((meshData: MeshData) => meshData.name === currentMesh!.name);
      if (meshData !== undefined) memoInput.text = meshData.memo;

      startingPoint = getGroundPosition();
      if (startingPoint) {
        setTimeout(() => {
          camera.detachControl();
        }, 0);
      }
    };

    // When selecting the ground.
    let pointerDownOnGround = () => {
      highlight.removeAllMeshes();
      currentMesh = null;
      camera.inputs.addMouseWheel();
      removeButton.isVisible = memoButton.isVisible = closeMemoButton.isVisible = memoInput.isVisible = false;
    };

    let pointerUp = () => {
      if (startingPoint) {
        camera.attachControl(canvas, true);
        startingPoint = null;
        return;
      }
    };

    let pointerMove = () => {
      if (!startingPoint) return;
      let current = getGroundPosition();
      if (!current) return;
      let diff = current.subtract(startingPoint);
      currentMesh!.position.addInPlace(diff);
      startingPoint = current;
    };

    scene.onPointerObservable.add((pointerInfo: BABYLON.PointerInfo) => {
      switch (pointerInfo.type) {
        case BABYLON.PointerEventTypes.POINTERDOWN:
          if (pointerInfo.pickInfo!.hit && pointerInfo.pickInfo!.pickedMesh !== ground) {
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
        (currentMesh as BABYLON.Mesh).rotate(BABYLON.Axis.Y, delta * 0.1, BABYLON.Space.WORLD);
        currentMesh.rotation = currentMesh.rotationQuaternion!.toEulerAngles();
        let meshData = meshDataList.find((meshData: MeshData) => meshData.name === currentMesh!.name);
        if (meshData !== undefined && meshData.name === currentMesh!.name) {
          meshData.rotation.y = currentMesh!.rotation.y;
          repository.setData("meshes", meshDataList);
        }
        PropagateChanes(`${SyncActionType.Rotate}_${currentMesh!.name}`, {
          name: currentMesh!.name,
          y: currentMesh!.rotation.y,
        });
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
