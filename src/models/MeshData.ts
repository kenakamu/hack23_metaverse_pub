export class MeshData {
  constructor(
    public name: string,
    public type: string,
    public position: { x: number; y: number; z: number },
    public scale: { x: number; y: number; z: number },
    public rotation: { x: number; y: number; z: number },
    public memo: string
  ) {}
}
