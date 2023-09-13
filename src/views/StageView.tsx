import "../App.css";
import React, { memo } from "react";
import { v4 as uuid } from "uuid";
import * as GUI from "@babylonjs/gui/2D";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import SceneComponent from "babylonjs-hook";
import { MeshData } from "../models/MeshData";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import {
  IRepositoryService,
  LocalStorageRepositoryService,
} from "../services/RepositoryService";
import {
  LiveShareClient,
  ILiveShareClientOptions,
} from "@microsoft/live-share";
import { LiveShareHost, app } from "@microsoft/teams-js";
import { useEffect, useState } from "react";
import { IFluidContainer, SharedMap, SharedString } from "fluid-framework";
import { LiveCanvas } from "@microsoft/live-share-canvas";
import { AzureClient, AzureClientProps } from "@fluidframework/azure-client";

//import { Inspector } from "@babylonjs/inspector";

// ... YOUR SCENE CREATION
export const inSecureClientOptions: ILiveShareClientOptions | any = {
  connection: {
    tenantId: "",
    tokenProvider: new InsecureTokenProvider("", {
      id: "123",
    }),
    endpoint: "",
    type: "remote",
  },
};
export const StageView = (): JSX.Element => {
  const [client, setClient] = useState();
  const [container, setContainer] = useState<IFluidContainer>();
  const [fluidClient, setFluidClient] = useState<AzureClient>();

  const containerSchema = {
    initialObjects: {
      liveCanvas: LiveCanvas,
      objRotateY: SharedMap,
      objName: SharedMap,
      cameraObj: SharedMap,
    },
  };
  let meshDataList: MeshData[] = [];

  const repository: IRepositoryService = new LocalStorageRepositoryService();
  let ground: BABYLON.GroundMesh;
  let camera: BABYLON.ArcRotateCamera;
  let hl: BABYLON.HighlightLayer;
  let canvas: BABYLON.Nullable<HTMLCanvasElement>;
  // data structure
  let currentMesh: BABYLON.Nullable<BABYLON.AbstractMesh> = null;
  // UI controls
  let removeButton: GUI.Button;
  let memoButton: GUI.Button;
  let closeMemoButton: GUI.Button;
  let memoInput: GUI.InputText;
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
        console.log(item.container);
        setContainer(item.container);
      });
    });
    // setFluidClient(new AzureClient(inSecureClientOptions));
    // createContainer().then((id) => {
    //   getContainer(id).then((item) => {
    //     setContainer(item);
    //   });
    // });
  }, []);

  const createContainer = async (): Promise<string> => {
    const { container } = await fluidClient!.createContainer(containerSchema);
    const containerId = await container.attach();
    return containerId;
  };

  const getContainer = async (id: string): Promise<IFluidContainer> => {
    const { container } = await fluidClient!.getContainer(id, containerSchema);
    console.log("container" + container);
    return container;
  };

  const onSceneReady = (scene: BABYLON.Scene) => {
    // Uncomment the following to show the BabylonJS Inspector.
    //Inspector.Show(scene, {});
    // Create Highlight Layer to show which mesh is selected.
    hl = new BABYLON.HighlightLayer("hl1", scene);
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
    meshDataList.map((meshData: MeshData) => {
      return CreateMeshAsync(scene, meshData);
    });

    // Adding buttons to the scene
    AddUIControl(scene);
    // Setup mouse control behaviors
    SetupPointerBehavior(scene);
    SetupMouseWheelBehavior(scene);
  };

  const onRender = (scene: BABYLON.Scene) => {};

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

    // meshes should be draggable for X and Z axies only.
    let pointerDragBehavior = new BABYLON.PointerDragBehavior({
      dragPlaneNormal: new BABYLON.Vector3(0, 1, 0),
    });
    pointerDragBehavior.onDragStartObservable.add((event) => {});
    pointerDragBehavior.onDragObservable.add((event) => {});
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
    });
    mesh.addBehavior(pointerDragBehavior);

    return mesh;
  }

  // Add buttons.
  function AddUIControl(scene: BABYLON.Scene) {
    const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Add table button
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
      let name = uuid();
      let newMesh = new MeshData(
        name,
        "table",
        { x: 0, y: 0, z: 0 }, // position
        { x: 2, y: 2, z: 2 }, // scale
        { x: 0, y: 0, z: 0 }, // rotation
        "This is table-" + name
      );

      CreateMeshAsync(scene, newMesh);
      // After creating a mesh, update the list and repository data.
      meshDataList.push(newMesh);
      repository.setData("meshes", meshDataList);
    });

    // Add chair button
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
      let name = uuid();
      let newMesh = new MeshData(
        name,
        "chair",
        { x: 0, y: 0, z: 0 }, // position
        { x: 2, y: 2, z: 2 }, // scale
        { x: 0, y: 0, z: 0 }, // rotation
        "This is chair-" + name
      );
      CreateMeshAsync(scene, newMesh);
      // After creating a mesh, update the list and repository data.
      meshDataList.push(newMesh);
      repository.setData("meshes", meshDataList);
    });

    // Remove Button
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
      memoButton.isVisible = false;
      closeMemoButton.isVisible = false;
      memoInput.isVisible = false;
      meshDataList.some((mesh: any, index: number) => {
        if (mesh.name === currentMesh!.name) {
          meshDataList.splice(index, 1);
          repository.setData("meshes", meshDataList);
          return true;
        }
      });
    });

    // Create Memo Buttom
    memoButton = GUI.Button.CreateSimpleButton("memoButton", "Memo");
    memoButton.width = "50px";
    memoButton.height = "20px";
    memoButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    memoButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    memoButton.color = "white";
    memoButton.background = "blue";
    memoButton.fontSize = 12;
    memoButton.isVisible = false;
    memoButton.onPointerClickObservable.add(() => {
      memoInput.isVisible = true;
      closeMemoButton.isVisible = true;
    });

    // Create Memo Buttom
    closeMemoButton = GUI.Button.CreateSimpleButton("closeMemoButton", "Close");
    closeMemoButton.width = "50px";
    closeMemoButton.height = "20px";
    closeMemoButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    closeMemoButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    closeMemoButton.color = "white";
    closeMemoButton.background = "blue";
    closeMemoButton.fontSize = 12;
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
          mesh.position_x = currentMesh!.position.x;
          mesh.position_y = currentMesh!.position.y;
          mesh.position_z = currentMesh!.position.z;
          mesh.rotation_y = currentMesh!.rotation.y;
          mesh.memo = value.text;
          repository.setData("meshes", meshDataList);
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
        camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
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
            mesh.position.x = currentMesh!.position.x;
            mesh.position.y = currentMesh!.position.y;
            mesh.position.z = currentMesh!.position.z;
            mesh.rotation.y = currentMesh!.rotation.y;
            repository.setData("meshes", meshDataList);
            return true;
          }
        });
      } else {
        camera.wheelPrecision = 50;
      }
    });
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
