import { Vector3 } from "@minecraft/server";

interface Type { id: string; EnChar: string; jpChar: string; charColor: string; indexColor: string;  enKey?: string; jpKey?: string; }
const circle: Type = { id: "circle", EnChar: "p", jpChar: "筒", charColor: "§9", indexColor: "§9" };
const bamboo: Type = { id: "bamboo", EnChar: "s", jpChar: "索", charColor: "§a", indexColor: "§a" };
const character: Type = { id: "character", EnChar: "m", jpChar: "萬", charColor: "§4", indexColor: "§7" };
const wind: Type = { id: "wind", EnChar: "z", jpChar: "", charColor: "§f", indexColor: "§7", enKey: "", jpKey: "" };
const dragon: Type = { id: "dragon", EnChar: "z", jpChar: "", charColor: "§f", indexColor: "", enKey: "", jpKey: "" };
const dragonIndexColor = { red: "§c", green: "§a", white: "§f" };
const dragonJpKey = { green: "發", white: "白", red: "中" };
const windJpKey = { east: "東", south: "南", west: "西", north: "北" };

const tileIds = [
  // wind
  "wind_east", "wind_south", "wind_west", "wind_north",
  // dragon
  "dragon_red", "dragon_green", "dragon_white",
  // tile_circle
  "circle_1", "circle_2", "circle_3", "circle_4", "circle_5", "circle_6", "circle_7", "circle_8", "circle_9",
  // tile_bamboo
  "bamboo_1", "bamboo_2", "bamboo_3", "bamboo_4", "bamboo_5", "bamboo_6", "bamboo_7", "bamboo_8", "bamboo_9",
  // tile_character
  "character_1", "character_2", "character_3", "character_4", "character_5", "character_6", "character_7", "character_8", "character_9"
];

export class Tile {
  private _identifier: string;
  private _location: Vector3;
  public type: Type;
  public isDrawn = true;

  public constructor(identifier: string, location?: Vector3) {
    this._identifier = identifier.replace("mahjong:tile_", "").replace("_block", "").replace("_item", "");
    this._location = location ?? {x: 0, y: 0, z: 0};
    switch (this.idComponents[0]) {
      case "circle": this.type = {...circle}; break;
      case "bamboo": this.type = {...bamboo}; break;
      case "character": this.type = {...character}; break;
      case "wind": 
        const windId = this.idComponents[1] as keyof typeof windJpKey;
        this.type = {...wind}; 
        this.type.enKey = windId[0];
        this.type.jpKey = windJpKey[windId];
        break;
      case "dragon": 
        const dragonId = this.idComponents[1] as keyof typeof dragonJpKey;
        this.type = {...dragon};
        this.type.indexColor = dragonIndexColor[dragonId];
        this.type.enKey = dragonId[0]
        this.type.jpKey = dragonJpKey[dragonId];
        break;
      default: this.type = { id: "", EnChar: "", jpChar: "", charColor: "", indexColor: "" }; break;
    }
  }

  public get identifier(): string {
    return this._identifier;
  }
  public get blockId(): string {
    return "mahjong:tile_" + this._identifier + "_block";
  }
  public get itemId(): string {
    return "mahjong:tile_" + this._identifier + "_item";
  }
  public get location(): Vector3 {
    return this._location;
  }
  public set location(location: Vector3) {
    this._location = location;
  }
  public get idComponents(): string[] {
    return this._identifier.split("_");
  }
  public get str(): string {
    const idComponents = this.idComponents;
    let index = this.idComponents[1];
    let indexColor = this.type.indexColor;
    if ((idComponents[2] ?? "nil") === "red") indexColor = "§c" // 赤ドラ
    if (this.type.EnChar === "z") index = this.type.jpKey!; // 字牌
    return `${indexColor}${index}${this.type.charColor}${this.type.jpChar}`;
  }
  public GetIndex(isSystem: boolean = false): number {
    let index = this.idComponents[1];
    switch (index) {
      case "east": return (isSystem ? 1 : 0);
      case "south": return (isSystem ? 2 : 1);
      case "west": return (isSystem ? 3 : 2);
      case "north": return (isSystem ? 4 : 3);
      case "white": return (isSystem ? 5 : 0);
      case "green": return (isSystem ? 6 : 1);
      case "red": return (isSystem ? 7 : 2);
      default:
        if ((this.idComponents[2] ?? "nil") === "red") return (isSystem ? 0 : 4);
        return parseInt(index) - (isSystem ? 0 : 1)
    }
  }
  
}
export const tiles: Tile[] = tileIds.map((id) => new Tile(id));

const tilesWithRedDora = tiles.map((tile) => { 
  if (!tile.identifier.includes("_5")) return tile;
  return new Tile(tile.identifier + "_red");
});

export const wall = tilesWithRedDora.concat(tiles).concat(tiles).concat(tiles);

export function ConvertToIdentifier(char: string, index?: number): string {
  if (!index) return "";
  let identifier = "mahjong:tile_";
  switch (char) {
    case "z":
      switch (index) {
        case 0: return identifier + "wind_east";
        case 1: return identifier + "wind_south";
        case 2: return identifier + "wind_west";
        case 3: return identifier + "wind_north";
        case 4: return identifier + "dragon_white";
        case 5: return identifier + "dragon_green";
        case 6: return identifier + "dragon_red";
      }
    case "p":
      if (index === 0) return identifier + "circle_5_red";
      return identifier + "circle_" + index;
    case "s":
      if (index === 0) return identifier + "bamboo_5_red";
      return identifier + "bamboo_" + index;
    case "m":
      if (index === 0) return identifier + "character_5_red";
      return identifier + "character_" + index;
    default: return "";
  }
}