export class DragInfo {
  constructor(
    public name: string,
    public x: number, 
    public z: number) {}
}

export class RotateInfo {
  constructor(
    public name: string,
    public y: number) {}
}

export enum SyncActionType {
  Add,
  Remove,
  Drag,
  Rotate,
  UpdateMemo,
}