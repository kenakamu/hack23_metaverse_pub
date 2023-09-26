import { FC, useEffect, useRef } from "react";
import * as BABYLON from "@babylonjs/core";
import { LiveState } from "@microsoft/live-share";
import { IFluidContainer, IValueChanged, SharedMap } from "fluid-framework";
import { CameraControlInfo, SyncActionType } from "../models/SyncInfo";

interface CameraControlProps {
    container: IFluidContainer;
    scene: BABYLON.Scene;
}

export const CameraContorl: FC<CameraControlProps> = ({ container, scene }) => {

    const updateFrequencies: number = 100;
    const framesToCompensate: number = 1 + updateFrequencies / (1000 / 60);
    let cameraSharedMap: SharedMap;
    let takeControl: LiveState;
    let takeCamControlButton: HTMLButtonElement;
    let remoteControlled: boolean;
    let currentCameraPosition: BABYLON.Vector3;
    let currentCameraRotation: BABYLON.Vector3;
    let takingControl: boolean;
    let lastTime: number;
    const initializeStartedRef = useRef(false);

    useEffect(() => {
        if (initializeStartedRef.current) return;
        initializeStartedRef.current = true;
        InitializeCameraControl();
        initializePresenceLogic(scene);
    }, []);

    // Use presence to share camera location info
    function initializePresenceLogic(scene: BABYLON.Scene) {
        cameraSharedMap = container!.initialObjects.cameraSharedMap as SharedMap;
        cameraSharedMap.on("valueChanged", (changed: IValueChanged, local: boolean) => {
            if (!local) {
                let cameraConrolInfo: CameraControlInfo = cameraSharedMap.get(changed.key) as CameraControlInfo;
                if (remoteControlled) {
                    let localCamera = scene.activeCamera as BABYLON.ArcRotateCamera;
                    BABYLON.Animation.CreateAndStartAnimation("camerapos",
                        scene.activeCamera,
                        "position", 60, framesToCompensate,
                        localCamera.position,
                        new BABYLON.Vector3(cameraConrolInfo.cameraPosition._x, cameraConrolInfo.cameraPosition._y - 0.7, cameraConrolInfo.cameraPosition._z), 0);

                    BABYLON.Animation.CreateAndStartAnimation("camerarot",
                        scene.activeCamera,
                        "rotation", 60, framesToCompensate,
                        localCamera.rotation,
                        new BABYLON.Vector3(cameraConrolInfo.cameraPosition._x, cameraConrolInfo.cameraPosition._y, cameraConrolInfo.cameraPosition._z), 0);
                }
            }
        });

        takeControl = container!.initialObjects.takeControl as LiveState;
        takeControl.on("stateChanged", (status, local) => {
            if (!local) {
                takeCamControlButton.disabled = status;
                remoteControlled = status;

                let localCamera = scene.activeCamera as BABYLON.ArcRotateCamera;
                if (remoteControlled) {
                    currentCameraPosition = localCamera.position.clone();
                    currentCameraRotation = localCamera.rotation.clone();
                    localCamera.detachControl();
                }
                else {
                    localCamera.position = currentCameraPosition;
                    localCamera.rotation = currentCameraRotation;
                    localCamera.attachControl();
                }
            }
        });
        (async () => await takeControl.initialize(false))();
        lastTime = new Date().getTime();
        let localCamera = scene.activeCamera as BABYLON.ArcRotateCamera;
        localCamera.onViewMatrixChangedObservable.add(async () => {
            if (!remoteControlled && new Date().getTime() - lastTime >= updateFrequencies) {
                let data = new CameraControlInfo(localCamera.position, localCamera.rotation);
                await cameraSharedMap.set(SyncActionType.CameraMove.toString(), data);
                lastTime = new Date().getTime();
            }
        });
    }

    function InitializeCameraControl() {
        takeCamControlButton = document.getElementById("takeCamControl") as HTMLButtonElement;
        takeCamControlButton.onclick = () => {
            takingControl = !takingControl;
            takeControl.set(takingControl);
            takeCamControlButton.innerHTML = takingControl ? "Release Camera Control" : "Take Camera Control";
        };
    }

    return (
        <div id="controlButtons">
            <button id="takeCamControl">Take Camera Control</button>
        </div>
    );
};
