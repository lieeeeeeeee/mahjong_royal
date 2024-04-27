import { world, Player, Block, EntityInventoryComponent, Vector3 } from "@minecraft/server";
import { Knight } from "./knight/knight";
import { Tile } from './tile';
import Round from "./round/round";

  export default class Game {
    private rouds: Round[] = [];
    private knights: Knight[] = [];
    public isStarted: boolean = false;
    private roundMaxCount: number = 1;
    private roundInterval: number = 10 * 20; // minutes * seconds * ticks
    private roundIntervalCount: number = 0;
    private initalPoints: number = 25000;
    private preparetionTime: number = 10 * 20; // minutes * seconds * ticks
    private overworld = world.getDimension("overworld");
    private spawnLocation: Vector3 = { x: -285, y: 73, z: 312 };

    // Initialize
    public constructor() {
    }

    public Test(player?: Player) {
      // world.sendMessage(`§lTest`); 
      this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Test"}]}`);
      if (player) {
        try {
          const value = player.level;
          player.sendMessage(`§o> §7Experience: §c${value}`);
          player.addLevels(value);
        } catch (error) {
          player.sendMessage(`§o> §7Error: §c${error}`);
        }
      } else {
        this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Player not found"}]}`);
      }
    }

    // Getters and Setters
    get currentRound(): Round {
      return this.rouds[this.rouds.length - 1];
    }

    // Psuedo standard methods
    public Init() {
      const players = world.getPlayers();
      const pointsObj = this.getScoreboardObjective("points");
      if (!pointsObj) return;
      this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Game initialized"}]}`);

      this.knights.forEach((knight) => {
        knight.object.kill();
      });
      this.knights = [];
      this.rouds = [];
      this.isStarted = false;
      this.roundIntervalCount = 0;
      pointsObj.getParticipants().forEach((participant) => {
        pointsObj.removeParticipant(participant.displayName);
      });
      players.forEach((player) => {
        const knight = new Knight(player.name, player);
        this.knights.push(knight);
        pointsObj.addScore(knight.decoratedName, this.initalPoints);
      });
    }
    private Start() {
      const pointsObj = this.getScoreboardObjective("points");
      if (!pointsObj) return;
      world.sendMessage(`§lゲーム§a開始`);
      this.isStarted = true;
      this.rouds = [];
      this.knights.forEach((knight) => {
        let inventory = knight.object.getComponent("inventory") as EntityInventoryComponent;
        knight.points = this.initalPoints;
        knight.hand.Init();
        pointsObj.setScore(knight.decoratedName, this.initalPoints);
        knight.object.resetLevel();
        inventory.container?.clearAll();
      });
      this.StartRound();
    }
    public End() {
      if (!this.isStarted) return;
      const currentRound = this.currentRound;
      world.sendMessage(`§lゲーム§c終了`);
      this.isStarted = false;
      this.roundIntervalCount = 0;
      this.preparetionTime = 10 * 20;
      this.knights.forEach((knight) => {
        let inventory = knight.object.getComponent("inventory") as EntityInventoryComponent;
        knight.ChangeGameMode("adventure");
        knight.object.addExperience(-knight.object.getTotalXp());
        inventory.container?.clearAll();
        knight.object.kill();
      });
      // 緊急終了した場合
      if (currentRound.isStarted) {
        currentRound.cleanUpTiles();
        currentRound.respawnWorldBorder();
        this.overworld.runCommand(`gamerule pvp false`);
      }
    }
    public Update() {
      if (!this.isStarted) return;
      if (this.knights.length === 0) { this.End(); return; }
      if (0 < this.preparetionTime) {
        if (this.preparetionTime % 20 === 0) { 
          this.overworld.runCommand(`title @a title §l§6${this.preparetionTime / 20}`);
        }
        this.preparetionTime--;
        return;
      } else if (this.preparetionTime === 0) {
        this.Start();
        this.preparetionTime = -1;
      }
      const currentRound = this.currentRound;
      if (currentRound.isStarted) {
        currentRound.Update();
      } else {
        if (this.roundIntervalCount++ <= this.roundInterval) return; 
        if (this.roundMaxCount < this.rouds.length + 1) { this.End(); return; }
        this.roundIntervalCount = 0;
        this.StartRound();
      }
    }

    // Event handlers
    public OnKnightDie(deadPlayer: Player, killer: Player) {
      if (!this.isStarted) return;
      const currentRound = this.currentRound;
      const knight = this.getKnight(deadPlayer.name);
      const killerKnight = this.getKnight(killer.name);
      currentRound.OnKnightDie(knight, killerKnight);
    }
    public OnKnightSpawn(player: Player) {
      if (!this.isStarted) return;
      const currentRound = this.currentRound;
      const knight = this.getKnight(player.name);
      currentRound.OnKnightSpawn(knight);
    }
    public OnKnightInteractWithBlock(player: Player, block: Block, itemId: string) {
      if (!this.isStarted) return;
      const currentRound = this.currentRound;
      const knight = this.getKnight(player.name);
      currentRound.OnKnightInteractWithBlock(block, itemId, knight);
    }
    public OnKnightUseWinningStick(player: Player, block: Block) {
      if (!this.isStarted) return;
      const currentRound = this.currentRound;
      const knight = this.getKnight(player.name);
      currentRound.OnKnightUseWinningStick(block, knight);
    }
    public OnKnightUsePointStick(player: Player, pointStickId: string) {
      if (!this.isStarted) return;
      const currentRound = this.currentRound;
      const knight = this.getKnight(player.name);
      currentRound.OnKnightUsePointStick(pointStickId, knight);
    }
    // Public custom methods
    public JoinPlayer(player: Player) {
      if (this.isAlreadyJoined(player.name)) return;
      const knight = new Knight(player.name, player);
      const pointsObj = this.getScoreboardObjective("points");
      if (!pointsObj) return;
      world.sendMessage(`§l§6${player.name} §fがゲームに§a参加§fしました`);
      if (player.nameTag !== "") player.nameTag = "";
      if (!pointsObj.hasParticipant(knight.decoratedName)) pointsObj.addScore(knight.decoratedName, this.initalPoints);
      if (this.isStarted) { 
        knight.ChangeGameMode("spectator"); 
      } else if (!knight.object.isOp()) {
        knight.ChangeGameMode("adventure");
      }
      knight.object.setSpawnPoint({
        dimension: this.overworld,
        x: this.spawnLocation.x,
        y: this.spawnLocation.y,
        z: this.spawnLocation.z
      });
      if (knight.object.isOp()) {
        try {
          knight.object.runCommand(`tp @s @e[type=minecraft:armor_stand,name=system]`);
        } catch (error) {
          knight.object.teleport(this.spawnLocation);
        }
      } else {
        knight.object.teleport(this.spawnLocation);
      }
      this.knights.push(knight);
    }
    public LeavePlayer(playerName: string) {
      const pointsObj = this.getScoreboardObjective("points");
      if (!pointsObj) return;
      const knightIndex = this.getKnightIndex(playerName);
      if (knightIndex === -1) return;
      const knight = this.knights[knightIndex];
      world.sendMessage(`§l§6${playerName} §fがゲームから§c退出§fしました`);
      if (pointsObj.hasParticipant(knight.decoratedName)) pointsObj.removeParticipant(knight.decoratedName);
      this.knights.splice(knightIndex, 1);
    }
    public ChangePlayerMode(playerName: string) {
      const knight = this.getKnight(playerName);
      if (!knight) return;
      knight.isParticipat = !knight.isParticipat;
      knight.object.sendMessage(`§o> §7あなたは${knight.isParticipat ? "参加者" : "観戦者"}になりました`);
    }
    public StartRound() {
      const pointsObj = this.getScoreboardObjective("points");
      if (!pointsObj) return;
      const round = new Round(this.rouds.length+1, this.knights, pointsObj);
      this.rouds.push(round);
      round.Start();
    }
    public DisplayKnightList() {
      let message = "Knight List: ";
      for (let knight of this.knights) {
        message += knight.name + ", ";
      }
      world.sendMessage(message);
    }

    // Private custom methods
    private getKnight(playerName: string): Knight | undefined {
      const index = this.getKnightIndex(playerName);
      if (index === -1) return;
      return this.knights[index];
    }
    private getKnightIndex(playerName: string): number {
      const knightIndex = this.knights.findIndex((knight) => knight.name === playerName);
      if (knightIndex === -1) this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7[ERROR] Player §c${playerName} §7not found"}]}`);
      return knightIndex;
    }
    private getScoreboardObjective(objectiveName: string) {
      const scoreboard = world.scoreboard;
      const objective = scoreboard.getObjective(objectiveName);
      if (!objective) this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7[ERROR] Objective §c${objectiveName} §7not found"}]}`);
      return objective;
    }
    private isAlreadyJoined(playerName: string): boolean {
      const bool = this.knights.find((knight) => knight.name === playerName) ? true : false;
      if (bool) this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7[ERROR] Player §c${playerName} §7is already joined"}]}`);
      return bool;
    }
  }

