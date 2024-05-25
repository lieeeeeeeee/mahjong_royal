import { world, Block, Vector3, ScoreboardObjective } from "@minecraft/server";
import WorldBorder from "./worldBorder";
import { Knight } from "../knight/knight";
import { Tile, wall, ConvertToIdentifier } from '../tile';
import { GetPointStick } from "../pointStick";


export default class Round {
    private readonly handCount: number = 13;
    private readonly second: number = 20;
    private readonly minute: number = 60 * this.second;
    private readonly preparationDuration: number = 10 * this.second;
    private readonly duration: number = 5 * this.minute; // <- ここを変更
    // private readonly duration: number = 15 * this.second; // <- ここを変更 test
    private readonly lebelReward: number = 100;
    private readonly initTileSpawnInterval: number = 6 * this.second; // <- ここを変更
    // private readonly initTileSpawnInterval: number = 5; // <- ここを変更 test
    private readonly rocketingInterval: number = 4 * this.second;
    private readonly reachReward: number = 2000;
    private readonly decreasePercentage: number = 0.1;
    private readonly overworld = world.getDimension("overworld");

    private index: number;
    private shuffledWall: Tile[] = [];
    public knights: Knight[];
    private placedTileLocs: Vector3[] = [];
    private worldBorder: WorldBorder = new WorldBorder();
    public isStarted: boolean = false;
    private pointsScoreboardObjective: ScoreboardObjective;
    private runTime = 0;
    private killCount: number = 0;
    private winnerCount: number = 0;
    private safeAreaSize: number = 20;
    private minSpawnableArea: number = this.safeAreaSize * 0.3;
    private tileSpawnInterval: number = this.initTileSpawnInterval;
    private isDuringTermination: boolean = false;

    // Initialize
    public constructor(index: number, knights: Knight[], pointsScoreboardObj: ScoreboardObjective) {
        this.index = index;
        this.knights = knights;
        this.pointsScoreboardObjective = pointsScoreboardObj;
    }

    public Test() {
    }

    // Psuedo standard methods
    public Start() {
        this.displayTile(`§l${this.index}局目 §a開始!!`, `準備時間${this.preparationDuration / 20}秒`);
        this.isStarted = true;
        this.safeAreaSize += this.knights.length * 15; // <- ここを変更
        this.spawnWorldBorder();
        this.overworld.runCommand(`gamerule pvp true`);
        for (let knight of this.knights) {
            const loc = this.getRandomLocation(this.minSpawnableArea);
            knight.Teleport(loc);
            if (!knight.isParticipat) continue;
            knight.ChangeGameMode("adventure");
            knight.GainInitialItems();

            this.distributeHand(knight);
            knight.object.addExperience(-knight.object.getTotalXp());
            knight.GainPointSticks(knight.points);
            knight.hand.GetDisplayedString();
        }
    }
    public End() {
        if (this.isDuringTermination) return;
        this.isDuringTermination = true;
        this.displayTile(`§l${this.index}局目 §c終了!!`);
        world.sendMessage(`§l結果:`);
        this.respawnWorldBorder();
        this.cleanUpTiles();
        this.overworld.runCommand(`gamerule pvp false`);
        this.knights.forEach((knight) => { 
            const handStr = knight!.hand.GetDisplayedString();
            const xiangting = knight!.hand.xiangting();
            const level = knight.object.level;
            // 和了れていない場合
            if (!knight.isWinner) {
                // ノーテン罰符
                if (0 < xiangting) {
                    knight.object.sendMessage(`§lリーチまでに§a${xiangting}枚§f足りないため§c${xiangting * 1000}点§f減点されました`);
                    knight.points -= xiangting * 1000;
                }
                // テンパイ報酬
                else {
                    knight.object.sendMessage(`§lテンパイのため§a${this.reachReward}点§f加点されました`);
                    knight.points += this.reachReward;
                }
            }
            // world.sendMessage(`§l${knight.name}: §6${knight.points}§f点 [${handStr}§f]`);
            knight.object.runCommand(`tellraw @a {"rawtext":[{"text": "§l${knight.name}: §6${knight.points}§f点 [§r${handStr}§f§l]"}]}`);
            knight.object.sendMessage(`§l経験値\"Level x 1000(§c${level * this.lebelReward}§f)\"を獲得しました`);
            knight.points += level * this.lebelReward;
            this.pointsScoreboardObjective.setScore(knight.decoratedName, knight.points);
            knight.ChangeGameMode("spectator");
            knight.object.playSound("horn.call.0");
            knight.Reset();
        });
        this.isStarted = false;
    }
    public Update() {
        if (!this.isStarted) return;
        const elapsedTime = this.runTime - this.preparationDuration;
        // 準備時間開始
        if (this.runTime === 0) {
            // プレイヤーの移動を停止
            this.knights.forEach((knight) => { knight.StopMovement(); });
        }
        // 準備時間中
        else if (this.runTime < this.preparationDuration) {
            const remainingTime = this.preparationDuration - this.runTime;
            if (this.runTime % this.second === 0) {
                if (remainingTime <= 5 * this.second) this.overworld.runCommand(`playsound random.orb @a`);
                this.setTimer("準備時間", 0, Math.floor(remainingTime / this.second));
            }
        } 
        // 準備時間終了
        else if (this.runTime === this.preparationDuration) {
            this.displayTile(`§l§aスタート!!`);
            this.overworld.runCommand(`playsound horn.call.0 @a`);
            // プレイヤーの移動を再開
            this.knights.forEach((knight) => { knight.ResumeMovement(); });
        }
        // ラウンド中
        else if (elapsedTime <= this.duration) {
            const remainingTime = this.duration - elapsedTime;
            // 牌を生成
            if (this.runTime % this.tileSpawnInterval === 0) {
                for (let i = 0; i < this.knights.length; i++) {
                    if (!this.knights[i].isParticipat) continue;
                    this.spawnTile();
                }
            }
            // リーチ中のプレイヤーの位置を表示
            if (remainingTime % this.rocketingInterval === 0) this.knights.forEach((knight) => { knight.ExposeLocation(); });
            // 手牌をactionbarに表示
            for (let knight of this.knights) {
                if (!knight.isParticipat) continue;
                if (knight.isWinner) continue;
                knight.DisplayHand();
            }// 残り時間を表示
            this.displayTime(remainingTime);
            // エリア外に出たプレイヤーにペナルティを与える
            this.worldBorder.AddDebuff(this.knights, this.safeAreaSize, this.getMapCenterLocation()!);
        } 
        // ラウンド終了
        else {
            this.End();
        }
        this.runTime++;
    }
    // Event handlers
    public OnKnightDie(knight?: Knight, killer?: Knight) {
        if (!this.isRoundInProgress(knight)) return;
        if (knight?.isRiichi) knight.isRiichi = false;
        const discardedTile = this.pickRandomTile(knight!.hand.tiles);
        const decreasePoints = knight!.points * this.decreasePercentage;
        const loc = knight!.object.location;
        this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §a${knight!.name} §7discarded §c${discardedTile.itemId}"}]}`);

        knight!.DiscardTile(discardedTile.itemId);
        discardedTile.location = {x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z)}
        this.placeTile(discardedTile);
        knight!.DropPointStick(decreasePoints);
        this.pointsScoreboardObjective.setScore(knight!.decoratedName, knight!.points);
        knight!.killCount = 0;

        if (killer) {
            const points = Math.floor(decreasePoints / 100) * 100;
            this.killCount++;
            killer.killCount++;
            killer.points += points;
            killer.object.sendMessage(`§l§6${knight!.name}§fから§a${points}点§fを獲得しました`);
            killer.DisplayKillEffect();
            this.spawnXp(10, knight!.object.location);
            this.pointsScoreboardObjective.setScore(killer.decoratedName, killer.points);
            this.tileSpawnInterval =  Math.max(this.initTileSpawnInterval - Math.floor(this.killCount / this.knights.length), this.second);
        }
    }
    public OnKnightSpawn(knight?: Knight) {
        if (!this.isRoundInProgress(knight)) return;
        const randomTile = this.drawTile();
        const randomLoc = this.getRandomLocation(this.minSpawnableArea);
        knight!.object.sendMessage(`§l§6${randomTile.itemId}§fを手に入れました`);
        knight!.DisplayHand(knight!.hand.GetDisplayedString());
        knight!.GainTile(randomTile);
        knight!.Teleport(randomLoc);
    }
    public OnKnightInteractWithBlock(block: Block, tileId: String, knight?: Knight) {
        if (!this.isRoundInProgress(knight)) return;
        const blockId = block.permutation.type.id;
        const breakedTile = new Tile(blockId, block.location);
        const filterdTile = knight!.hand.tiles.filter((t) => t.itemId === breakedTile.itemId);
        if (4 <= filterdTile.length) {
            knight!.object.sendMessage(`§l§6同種の牌は4枚までしか持てません`);
            return;
        }
        knight!.DiscardTile(tileId);
        this.pickUpTile(knight!, breakedTile);
        const xiangting = knight!.hand.xiangting();
        this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7${knight!.name} §6${xiangting}向聴"}]}`);
        if(xiangting === 0) {
            const xiangpai = knight!.hand.tingpai();
            const ids = xiangpai.map((tile) => ConvertToIdentifier(tile[0], Number(tile[1])));
            const tiles = ids.map((id) => new Tile(id));
            world.sendMessage(`§l§6${knight!.name}§fが§aリーチ§fしました`);
            tiles.forEach((tile) => {
                const loc = this.getRandomLocation(this.minSpawnableArea);
                this.spawnTile(tile, loc);
            });
            // knight!.object.sendMessage(`§l[${knight!.hand.getDisplayTingpaiString()}§f]でアガれます`);
            knight!.object.runCommand(`tellraw @a {"rawtext":[{"text": "§l[§r${knight!.hand.getDisplayTingpaiString()}§l§f]でアガれます"}]}`);
            knight!.isRiichi = true;
        } else { 
            knight!.object.sendMessage(`§lあと§6${xiangting}枚§f揃えるとリーチできます`);
            knight!.isRiichi = false;
        }
        this.spawnXp(10, block.location);
    }
    public OnKnightUseWinningStick(block: Block, knight?: Knight) {
        if (!this.isRoundInProgress(knight)) return;
        if (knight!.isWinner) return;
        const blockId = block.permutation.type.id;
        const breakedTile = new Tile(blockId, block.location);
        knight!.DisplayResult(breakedTile);
        if(!knight!.isWinner) return;
        this.breakBlock(block.location);
        this.pointsScoreboardObjective.setScore(knight!.decoratedName, knight!.points);
        this.winnerCount++;
        if (this.knights.length === this.winnerCount) this.End();
    }
    public OnKnightUsePointStick(pointStickId: string, knight?: Knight, block?: Block) {
        if (!this.isRoundInProgress(knight)) return;
        const pointStick = GetPointStick(pointStickId);
        if (!pointStick) return;
        if (pointStick.point === 5000 || pointStick.point === 10000 || pointStick.point === 100) return;
        knight!.points -= pointStick.point;
        this.pointsScoreboardObjective.setScore(knight!.decoratedName, knight!.points);
    }
    // Public custom methods
    public cleanUpTiles() {
        for (let tileLoc of this.placedTileLocs) this.breakBlock(tileLoc);
        this.placedTileLocs = [];
    }
    public respawnWorldBorder() {
        this.overworld.runCommand(`scoreboard players set @e[name=system, type=armor_stand] anti_type 0`);
    }

    // Private custom methods
    private spawnTile(tile?: Tile, loc?: Vector3) {
        const randomTile = tile ?? this.drawTile();
        const location = loc ?? this.getRandomLocation();
        if (location.y <= -64) return;
        randomTile.location = location;
        this.placeTile(randomTile);
    }
    private placeTile(tile: Tile) {
        const tileLoc = tile.location;
        // world.sendMessage(`§l§6${tileLoc.x} ${tileLoc.y} ${tileLoc.z}§fに設置しました`);
        this.overworld.runCommand(`setblock ${tileLoc.x} ${tileLoc.y} ${tileLoc.z} ${tile.blockId} keep`);
        this.placedTileLocs.push(tileLoc);
    }
    private pickUpTile(knight: Knight, tile: Tile) {
        knight.PickUpTile(tile);
        this.breakBlock(tile.location);
    }
    private drawTile(): Tile {
        if (this.shuffledWall.length === 0) {
            this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7wall is empty"}]}`);
            this.shuffledWall = this.shuffleWall(wall);
        }
        return this.shuffledWall.pop()!;
    }
    private pickRandomTile(tiles: Tile[]): Tile {
        const randomIndex = Math.floor(Math.random() * tiles.length);
        return tiles[randomIndex];
    }
    private distributeHand(knight: Knight) {
        const hand: Tile[] = [];
        for (let i = 0; i < this.handCount; i++) {
            hand.push(this.drawTile());
        }
        knight.GainInitialHand(hand);
    }
    private spawnWorldBorder() {
        const mapCenterLoc = this.getMapCenterLocation();
        if (!mapCenterLoc) return;
        this.overworld.runCommand(`scoreboard players set @e[name=system, type=armor_stand] anti_type 1`);
        this.overworld.runCommand(`scoreboard players set @e[name=system, type=armor_stand] anti_x ${Math.floor(mapCenterLoc.x) * 100}`);
        this.overworld.runCommand(`scoreboard players set @e[name=system, type=armor_stand] anti_z ${Math.floor(mapCenterLoc.z)* 100}`);
        this.overworld.runCommand(`scoreboard players set @e[name=system, type=armor_stand] anti_y ${-64 * 100}`);
        this.overworld.runCommand(`scoreboard players set @e[name=system, type=armor_stand] anti_r ${this.safeAreaSize * 100}`);
    }
    
    private breakBlock(loc: Vector3, option: string = "replace") {
        // world.sendMessage(`§l§6${loc.x} ${loc.y} ${loc.z}§fを破壊しました`);
        this.overworld.runCommand(`setblock ${loc.x} ${loc.y} ${loc.z} air ${option}`);
    }
    private isRoundInProgress(knight?: Knight): boolean {
        return this.isStarted && (knight?.isParticipat ?? false);
    }
    private getMapCenterLocation(): Vector3 | null {
        const MapCenter = this.overworld.getEntities({name: "MapCenter"})[0] ?? null;
        if (!MapCenter) return null;
        return MapCenter.location;
    }
    private getRandomLocation(min: number = 0): Vector3 {
        const centerLoc = this.getMapCenterLocation();
        if (!centerLoc) return {x: 0, y:-64, z: 0};
        const r = Math.random() * (this.safeAreaSize - min) + min;
        const theta = Math.random() * 2 * Math.PI;
        const x = Math.floor(centerLoc.x + r * Math.cos(theta));
        const z = Math.floor(centerLoc.z + r * Math.sin(theta));
        const y = this.getSurficeLocationY(x, z) + 1;
        return {x: x, y: y, z: z};
    }
    private getSurficeLocationY(x: number, z: number): number {
        const loc = {x: x, y: 128, z: z};
        while (this.overworld.getBlock(loc)?.isAir) {
            loc.y--;
            if (loc.y <= -64) { return -64; }
        }
        if (loc.y === 128) return -64;
        return loc.y;
    }
    private shuffleWall(wall: Tile[]): Tile[] {
        let shuffledWall = wall.slice();
        for (let i = shuffledWall.length - 1; 0 < i; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledWall[i], shuffledWall[j]] = [shuffledWall[j], shuffledWall[i]];
        }
        return shuffledWall;
    }
    private spawnXp(n: number, loc: Vector3) {
        for (let i = 0; i < n; i++) {
            const x = loc.x + Math.random() * 2;
            const y = loc.y + Math.random() * 2;
            const z = loc.z + Math.random() * 2;
            this.overworld.spawnEntity("minecraft:xp_orb", {x: x, y: y, z: z});
        }
    }
    private setTimer(title: string, min: number, sec: number) {
        this.overworld.runCommand(`title @a actionbar §l§a${title}: ${min}:${(sec < 10) ? "0" + sec : sec}`);
    }
    private displayTime(elapsedTime: number) {
        // 1分ごとに残り時間を表示
        if (this.minute < elapsedTime) {
            if (elapsedTime % (this.minute) !== 0) return;
            const min = Math.floor(elapsedTime / this.minute);
            world.sendMessage(`§l残り時間: §a${min}分`);
        }
        // 残り1分を切ったら10秒ごとに残り時間を表示
        else if (this.second * 10 < elapsedTime) {
            if (elapsedTime % (this.second * 10) !== 0) return;
            const sec = elapsedTime / this.second;
            world.sendMessage(`§l残り時間: §a${sec}秒`);
        }
        // 残り10秒を切ったら1秒ごとに残り時間を表示
        else {
            if (elapsedTime % this.second !== 0) return;
            this.displayTile(`§l§a${elapsedTime / this.second}`);
            this.knights.forEach((knight) => { knight.object.playSound("random.orb"); });
        }
    }
    private displayTile(main: string, sub?: string) {
        this.displayMainTitle(main);
        if (sub) this.displaySubTitle(sub);
    }
    private displayMainTitle(title: string) {
        this.overworld.runCommand(`title @a title §l${title}`);
    }
    private displaySubTitle(subTitle: string) {
        this.overworld.runCommand(`title @a subtitle §l${subTitle}`);
    }
}