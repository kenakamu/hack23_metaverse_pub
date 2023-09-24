import { FC, useEffect, useRef } from "react";
import * as BABYLON from "@babylonjs/core";
import { LiveState, LivePresence, LivePresenceUser } from "@microsoft/live-share";
import { IFluidContainer } from "fluid-framework";
import { ICameraControlInfo } from "../models/SyncInfo";

interface CameraControlProps {
    container: IFluidContainer;
    scene: BABYLON.Scene;
}

export const CameraContorl: FC<CameraControlProps> = ({ container, scene }) => {

    const updateFrequencies: number = 100;
    const framesToCompensate: number = 1 + updateFrequencies / (1000 / 60);
    let presence: LivePresence<ICameraControlInfo>;
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
    });

    // Use presence to share camera location info
    function initializePresenceLogic(scene: BABYLON.Scene) {
        presence = container!.initialObjects.presence as LivePresence<ICameraControlInfo>;
        presence.on("presenceChanged", (userPresence: LivePresenceUser<ICameraControlInfo>, local: boolean) => {
            // If it's not the local user
            if (!local) {
                console.dir(userPresence);
                if (userPresence.state === "online") {
                    if (remoteControlled) {
                        let localCamera = scene.activeCamera as BABYLON.ArcRotateCamera;
                        BABYLON.Animation.CreateAndStartAnimation("camerapos",
                            scene.activeCamera,
                            "position", 60, framesToCompensate,
                            localCamera.position,
                            new BABYLON.Vector3(userPresence.data!.cameraPosition._x, userPresence.data!.cameraPosition._y - 0.7, userPresence.data!.cameraPosition._z), 0);

                        BABYLON.Animation.CreateAndStartAnimation("camerarot",
                            scene.activeCamera,
                            "rotation", 60, framesToCompensate,
                            localCamera.rotation,
                            new BABYLON.Vector3(userPresence.data!.cameraPosition._x, userPresence.data!.cameraPosition._y, userPresence.data!.cameraPosition._z), 0);
                    }
                }
            }
        });
        takeControl = container!.initialObjects.takeControl as LiveState;
        takeControl.on("stateChanged", (status, local) => {
            if (!local) {
                takeCamControlButton.disabled = status;
                remoteControlled = status;

                let localCamera = scene.activeCamera as BABYLON.ArcRotateCamera;
                // Someone is now taking control your camera
                if (remoteControlled) {
                    currentCameraPosition = localCamera.position.clone();
                    currentCameraRotation = localCamera.rotation.clone();
                    // Removing input focus from the canvas to avoid moving the camera
                    localCamera.detachControl();
                }
                else {
                    localCamera.position = currentCameraPosition;
                    localCamera.rotation = currentCameraRotation;
                    // Re-attaching input focus to the canvas to allow moving the camera
                    localCamera.attachControl();
                }
            }
        });
        (async () => await takeControl.initialize(false))();
        (async () => await presence.initialize())();
        lastTime = new Date().getTime();
        let localCamera = scene.activeCamera as BABYLON.ArcRotateCamera;
        // Babylon.js event sent everytime the view matrix is changed
        // Useful to know either a position, a rotation or
        // both have been updated
        localCamera.onViewMatrixChangedObservable.add(async () => {
            // sending new camera position & rotation updates every 100 ms
            // to avoid sending too frequent updates over the network
            if (!remoteControlled && new Date().getTime() - lastTime >= updateFrequencies && presence.isInitialized) {
                let data: ICameraControlInfo = {
                    cameraPosition: localCamera.position,
                    cameraRotation: localCamera.rotation,
                };
                await presence.update(data);
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
