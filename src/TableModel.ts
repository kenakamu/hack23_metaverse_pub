export class TableModel {
    public constructor(name: string, position_x: number, position_y: number, position_z: number) {
        this.name = name;
        this.position_x = position_x;
        this.position_y = position_y;
        this.position_z = position_z;
      }
    name: string;
    position_x: number;
    position_y: number;
    position_z: number;
}