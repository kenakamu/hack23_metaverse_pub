export class MeshDataModel {
  public constructor(
    type: string,
    name: string,
    position_x: number,
    position_y: number,
    position_z: number,
    rotation_y: number
  ) {
    this.type = type;
    this.name = name;
    this.position_x = position_x;
    this.position_y = position_y;
    this.position_z = position_z;
    this.rotation_y = rotation_y;
  }
  type: string;
  name: string;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_y: number;
}
