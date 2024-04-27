import { world , Player, CompoundBlockVolumePositionRelativity } from "@minecraft/server";
import Game from "./game";
import { Tile, tiles } from "./tile";

type waitPlayer = { name: string, count: number };
export default class Mahjong {
  public game: Game = new Game();
  private waitList: waitPlayer[] = [];
  private overworld = world.getDimension("overworld");

  public Test(player?: Player) {
    this.game.Test(player);
  }

  // Event handlers
  public OnPlayerJoin(playerName: string) {
    const waitPlayer: waitPlayer = { name: playerName, count: 0 };
    this.waitList.push(waitPlayer);
  }
  public OnPlayerSpawn(playerName: string) {
    const player = this.getPlayer(playerName);
    if (!player) return;
    this.game.OnKnightSpawn(player);
    
  }

  public JoinPlayer() {
    if (this.waitList.length === 0) return;
    const waitList = this.waitList;
    for (let i = 0; i < waitList.length; i++) {
      const player = this.getPlayer(waitList[i].name);
      waitList[i].count++;
      if (10 < waitList[i].count) { 
        this.waitList.splice(i, 1);
        continue;
      }
      if (!player) continue;
      this.game.JoinPlayer(player);
      this.waitList.splice(i, 1);
    }
  }
  public LeavePlayer(playerName: string) {
    this.game.LeavePlayer(playerName);
  }
  public ChangePlayerMode(playerName: string) {
    this.game.ChangePlayerMode(playerName);
  }
  private getPlayer(name: string): Player | null {
    const player = world.getPlayers().find((player) => player.name === name);
    if (!player) {
      this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7[ERROR] Player not found: §c${name}"}]}`);
      return null;
    }
    return player;
  }
}

