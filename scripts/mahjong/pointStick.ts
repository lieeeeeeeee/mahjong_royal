export class PointStick {
  private _point: number;

  public constructor(point: number) {
    this._point = point;
  }

  public get point(): number {
    return this._point;
  }
  public get blockId(): string {
    return "mahjong:point_stick_" + this._point + "_block";
  }
  public get itemId(): string {
    return "mahjong:point_stick_" + this._point + "_item";
  }
}
const pointStickValues = [10000, 5000, 1000, 500, 100];
export const pointSticks = pointStickValues.map((value) => new PointStick(value));
export function GetPointStick(id: string): PointStick {
  return pointSticks.find((pointStick) => pointStick.itemId === id)!;
}
