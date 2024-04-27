import { Shoupai, Util } from '@kobalab/majiang-core';
import { Tile } from '../tile';

export class Hand {
  public tiles: Tile[] = [];
  public displayedString: string = "";
  // Psuedo standard methods
  public Init() {
    this.tiles = [];
  }
  // Getters and Setters
  public get systemString(): string {
    const sorted: { [key: string]: Tile[][] } = this.sortByType();
    let str = "";

    for (let key in sorted) {
      const tiles = sorted[key].flat();
      if (tiles.length === 0) continue;
      str += tiles[0].type.EnChar;
      str += tiles.map((tile) => tile.GetIndex(true)).join("");
    }
    return str;
  }
  // Public custom methods
  public Sorted(): Tile[] {
    const sorted = this.sortByType();
    return sorted.characters.concat(sorted.bamboos).concat(sorted.circles).concat(sorted.winds).concat(sorted.dragons).flat();
  }
  public Sort() {
    this.tiles = this.Sorted();
  }
  
  public xiangting(): number {
    return Util.xiangting(Shoupai.fromString(this.systemString));
  }
  public tingpai(): string[] {
    return Util.tingpai(Shoupai.fromString(this.systemString));
  }
  public GetDisplayedString(): string {
    const str = this.tiles.map((tile) => tile.str).join("§f,");
    this.displayedString = str;
    return str;
  }
  public getDisplayTingpaiString(): string {
    const tingpai = this.tingpai();
    let displayTingpaiStr: string = "";
    tingpai.forEach((tile, index) => {
      const type = tile[0];
      const tileIndex = tile[1];
      let str = "";
      switch (type) {
        case "p": str = `§9${tileIndex}§9筒`; break;
        case "s": str = `§a${tileIndex}§a索`; break;
        case "m": str = `§7${tileIndex}§4萬`; break;
        case "z": 
          switch (tileIndex) {
            case "1": str = `§7東`; break;
            case "2": str = `§7南`; break;
            case "3": str = `§7西`; break;
            case "4": str = `§7北`; break;
            case "5": str = `§f白`; break;
            case "6": str = `§2發`; break;
            case "7": str = `§4中`; break;
          }
          break;
      }
      displayTingpaiStr += str + (index === tingpai.length - 1 ? "" : " §r§for§l ");
    });
    return displayTingpaiStr;
  }
  public GetResult(isRiichi: boolean, winningTile: Tile): any {
    if (winningTile.isDrawn) this.tiles.push(winningTile);
    const shoupai = Shoupai.fromString(this.systemString);
    const param = Util.hule_param({
      zhuangfeng: 0,
      menfeng: 1,
      lizhi: isRiichi ? 1 : 0,
      yifa: false,
      qianggang: false,
      lingshang: false,
      haidi: 0,
      tianhu: 0,
      baopai: [],
      fubaopai: null,
      changbang: 0,
      lizhibang: 0
    });
    return Util.hule(shoupai, "", param);
  }

  // Private custom methods
  private sortByType() {
    let characters: Tile[][] = [[], [], [], [], [], [], [], [], []];
    let bamboos: Tile[][] = [[], [], [], [], [], [], [], [], []];
    let circles: Tile[][] = [[], [], [], [], [], [], [], [], []];
    let winds: Tile[][] = [[], [], [], []];
    let dragons: Tile[][] = [[], [], []];
    this.tiles.forEach((tile) => {
      switch (tile.type.id) {
        case "character": characters[tile.GetIndex()].push(tile); break;
        case "bamboo": bamboos[tile.GetIndex()].push(tile); break;
        case "circle": circles[tile.GetIndex()].push(tile); break;
        case "wind": winds[tile.GetIndex()].push(tile); break;
        case "dragon": dragons[tile.GetIndex()].push(tile); break;
      }
    });
    return {characters: characters, bamboos: bamboos, circles: circles, winds: winds, dragons: dragons};
  }

}