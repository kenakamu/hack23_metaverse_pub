import { MeshData } from "../models/MeshData";

export interface IRepositoryService {
  setData(key: string, meshDataList: MeshData[]): void;
  getData(key: string): MeshData[];
}

export class LocalStorageRepositoryService implements IRepositoryService {
  setData(key: string, meshDataList: MeshData[]) {
    localStorage.setItem(key, JSON.stringify(meshDataList));
  }

  getData(key: string): MeshData[] {
    var meshDataList: MeshData[] = [];
    var meshesJson = localStorage.getItem("meshes");
    if (meshesJson === null) {
      meshesJson = "[]";
    }
    var meshesData = JSON.parse(meshesJson!);
    for (let mesh of meshesData) {
      meshDataList.push(
        new MeshData(
          mesh.name,
          mesh.type,
          mesh.position,
          mesh.scale,
          mesh.rotation,
          mesh.memo
        )
      );
    }
    return meshDataList;
  }
}
