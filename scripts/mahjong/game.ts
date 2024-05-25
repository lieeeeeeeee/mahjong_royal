import { world, Player, Block, EntityInventoryComponent, Vector3 } from "@minecraft/server";
import { Knight } from "./knight/knight";
import { Tile } from './tile';
import Round from "./round/round";

  export default class Game {
    private readonly second: number = 20;
    private readonly roundInterval: number = 10 * this.second;
    private readonly preparetionTime: number = 5 * this.second;
    private readonly resultAnnounceTime: number = 20 * this.second;
    private readonly roundMaxCount: number = 2;
    private readonly initalPoints: number = 25000;
    private readonly overworld = world.getDimension("overworld");
    private readonly winnerLocation: Vector3 = { x: -486, y: 85, z: 355 };
    private readonly loserLocation: Vector3 = { x: -479, y: 81, z: 355 };

    private rouds: Round[] = [];
    private knights: Knight[] = [];
    public isStarted: boolean = false;
    private roundIntervalCount: number = 0;
    private preparetionTimeCount: number = 0;
    private resultAnnounceTimeCount: number = 0;
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
        if (!knight.object.isOp()) knight.object.kill();
      });
      this.knights = [];
      this.rouds = [];
      this.isStarted = false;
      this.roundIntervalCount = 0;
      this.preparetionTimeCount = 0;
      this.resultAnnounceTimeCount = 0;
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
      const players = world.getPlayers();
      if (!pointsObj) return;
      world.sendMessage(`§lゲーム§a開始`);
      this.isStarted = true;
      this.rouds = [];
      this.resultAnnounceTimeCount = 0;
      this.knights.forEach((knight) => {
        let inventory = knight.object.getComponent("inventory") as EntityInventoryComponent;
        knight.points = this.initalPoints;
        knight.hand.Init();
        pointsObj.setScore(knight.decoratedName, this.initalPoints);
        knight.object.nameTag = "";
        knight.object.resetLevel();
        inventory.container?.clearAll();
      });
      pointsObj.getParticipants().forEach((participant) => {
        if (!this.knights.find((knight) => knight.decoratedName === participant.displayName)) pointsObj.removeParticipant(participant.displayName);
      });

      this.StartRound();
    }
    public End() {
      if (!this.isStarted) return;
      const currentRound = this.currentRound;
      world.sendMessage(`§lゲーム§c終了`);
      // 緊急終了した場合
      if (currentRound.isStarted) {
        currentRound.cleanUpTiles();
        currentRound.respawnWorldBorder();
        this.overworld.runCommand(`gamerule pvp false`);
      }
      this.isStarted = false;
      this.roundIntervalCount = 0;
      this.preparetionTimeCount = 0;
      this.resultAnnounceTimeCount = 0;
      this.rouds = [];
      this.knights.forEach((knight) => {
        let inventory = knight.object.getComponent("inventory") as EntityInventoryComponent;
        knight.ChangeGameMode("adventure");
        knight.object.addExperience(-knight.object.getTotalXp());
        knight.object.nameTag = knight.name;
        knight.hand.Init();
        knight.Teleport(this.spawnLocation);
        inventory.container?.clearAll();
      });
      
    }
    public Update() {
      if (!this.isStarted) return;
      if (this.knights.length === 0) { this.End(); return; }
      // world.sendMessage(`${this.preparetionTimeCount}`)
      if (this.preparetionTimeCount < this.preparetionTime) {
        if (this.preparetionTimeCount % 20 === 0) { 
          const time = (this.preparetionTime - this.preparetionTimeCount) / 20;
          this.overworld.runCommand(`title @a title §l§6${time}`);
        }
        this.preparetionTimeCount++;
      } else if (this.preparetionTimeCount === this.preparetionTime) {
        this.Start();
        this.preparetionTimeCount++;
      } else {
        const currentRound = this.currentRound;
        if (currentRound.isStarted) {
          currentRound.Update();
        } else {
          if (this.roundIntervalCount++ <= this.roundInterval) return;
          // 試合終了時
          if (this.roundMaxCount < this.rouds.length + 1) {
            // 結果発表
            if (this.resultAnnounceTimeCount === 0) {
              const winner = this.knights.reduce((a, b) => a.points > b.points ? a : b);
              world.sendMessage(`§l§6${this.resultAnnounceTime / 20}秒後§fにホームに戻ります`);
              this.overworld.runCommand(`title @a title §l§c勝者: §6${winner.name}`);
              this.knights.forEach((knight) => {
                knight.ChangeGameMode("adventure");
                if (knight === winner) {
                  knight.object.teleport(this.winnerLocation, { facingLocation: this.loserLocation });
                } else {
                  knight.object.teleport(this.loserLocation, { facingLocation: this.winnerLocation });
                }
              });
            } else if (this.resultAnnounceTimeCount === this.resultAnnounceTime) {
              this.End();
            }
            this.resultAnnounceTimeCount++;
          }
          // 次の試合へ
          else {
            this.roundIntervalCount = 0;
            this.StartRound();
          }
        }
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
          knight.object.runCommand(`tp @s @e[type=minecraft:armor_stand,name=system, tag=op]`);
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

