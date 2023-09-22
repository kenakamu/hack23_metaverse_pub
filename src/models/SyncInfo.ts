import * as BABYLON from "@babylonjs/core";

export class DragInfo {
  constructor(
    public name: string,
    public x: number,
    public z: number) { }
}

export class RotateInfo {
  constructor(
    public name: string,
    public y: number) { }
}

export class CameraControlInfo {
  constructor(
    public cameraPosition: BABYLON.Vector3,
    public cameraRotation: BABYLON.Vector3,
  ) { }
}

export interface ICameraControlInfo {
  cameraPosition: BABYLON.Vector3,
  cameraRotation: BABYLON.Vector3
}

export enum SyncActionType {
  Add,
  Remove,
  Drag,
  Rotate,
  UpdateMemo,
}
