import { world, Player, EntityInventoryComponent, ItemStack, Vector3 } from "@minecraft/server";
import { Tile } from '../tile';
import { Hand } from "./hand";
import { pointSticks } from "../pointStick";

export class Knight {
  private _name: string;
  private _object: Player;
  private _inventory: EntityInventoryComponent;
  public hand: Hand = new Hand();
  public isParticipat: boolean = true;
  public isRiichi: boolean = false;
  public isWinner: boolean = false;
  public canMove: boolean = true;
  public points: number = 0;
  public killCount: number = 0;
  private inventorySize = 36;

  private overworld = world.getDimension("overworld");
  private initialItemIds: string[] = [
    "mahjong:winning_stick",
    "minecraft:stone_sword"
  ];

  public constructor(name: string, object: Player) {
    this._name = name;
    this._object = object;
    this._inventory = object.getComponent("inventory") as EntityInventoryComponent;
  }

  // Psuedo standard methods
  public Reset() {
    this.killCount = 0;
    this.isRiichi = false;
    this.isWinner = false;
    this.hand.Init();
    this.inventory.container?.clearAll();
  }

  // Getters and Setters
  public get name(): string {
    return this._name;
  }
  public get decoratedName(): string {
    return `§l§6${this.name}:`;
  }
  public get object(): Player {
    return this._object;
  }
  public get inventory(): EntityInventoryComponent {
    return this._inventory;
  }
  public get canWin(): boolean {
    return this.hand.xiangting() === 0;
  }
  public DisplayResult(winningTile: Tile) {
    if (0 < this.hand.xiangting()) { this.getPunish(); return; }
    try {
      const result = this.hand.GetResult(this.isRiichi, winningTile);
      const yakus = result.hupai as any[];
      const points = result.defen;
      world.sendMessage(`----------------`);
      world.sendMessage(`§l§6${this.name}§fが§a${points}点§fで和了しました`);
      world.sendMessage(`§l[${this.hand.GetDisplayedString()}§f]`);
      world.sendMessage(`§l${yakus.map((yaku) => `§7${yaku.name}§f: §c${yaku.fanshu}翻`).join("\n")}`);
      world.sendMessage(`----------------`);
      this.object.runCommand(`title @s title §l§6${points}点`);
      this.object.playSound("random.totem");
      this.points += points;
      this.WinRound();
    } catch (e) {
      this.getPunish();
    }
  }
  public GainPointSticks(points: number) {
    let inventory = this.object.getComponent("inventory") as EntityInventoryComponent;
    const p = Math.floor(points / 100) * 100;
    const pointStickCount = this.culculateStickCount(p);
    for (let i = 0; i < pointSticks.length; i++) {
      const cout = pointStickCount[i];
      if (cout === 0) continue;
      inventory.container?.addItem(new ItemStack(pointSticks[i].itemId, cout));
    }
  }
  public GainInitialItems() {
    this.initialItemIds.forEach((itemId) => {
      this.inventory.container?.addItem(new ItemStack(itemId, 1));
    });
  }
  public GainInitialHand(tiles: Tile[]) {
    tiles.forEach((tile) => { this.PushTileToHand(tile);});
    this.hand.Sort();
    this.hand.tiles.forEach((tile) => { this.AddTileToInventory(tile);});
  }
  public PickUpTile(tile: Tile) {
    this.object.playSound("dig.wood");
    this.GainTile(tile);
    this.hand.Sort();
    this.DisplayHand(this.hand.GetDisplayedString());
  }
  public DiscardTile(tileId: String) {
    const index = this.hand.tiles.findIndex((tile) => tile.itemId === tileId);
    if (index === -1) {
      this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §a${this.name} §7手牌に§6${tileId} §7が見つかりません\n手牌: ${this.hand.displayedString}"}]}`);
      return;
    }
    // from hand
    this.hand.tiles.splice(index, 1);

    // from inventory
    for (let i = 0; i < this.inventorySize; i++) {
      const item = this.inventory.container?.getItem(i);
      if (item?.type.id !== tileId) continue;
      this.inventory.container?.setItem(i);
      return;
    }
  }
  public GainTile(tile: Tile) {
    this.PushTileToHand(tile);
    this.AddTileToInventory(tile);
  }
  public AddTileToInventory(tile: Tile) {
    let inventory = this.object.getComponent("inventory") as EntityInventoryComponent;
    inventory.container?.addItem(new ItemStack(tile.itemId, 1));
  }
  public PushTileToHand(tile: Tile) {
    this.hand.tiles.push(tile);
  }
  public DropPointStick(decrement: number) {
    let inventory = this.object.getComponent("inventory") as EntityInventoryComponent;
    const dec = Math.floor(decrement / 100) * 100;
    const pointStickCount = this.culculateStickCount(dec);
    for (let i = 0; i < this.inventorySize; i++) {
      const item = inventory.container?.getItem(i);
      if (!item) continue;
      if (!item.getTags().includes("mahjong:point_stick_item")) continue;
      this.cleanInventory(i);
    }
    for (let i = 0; i < pointSticks.length; i++) {
      const cout = pointStickCount[i];
      if (cout === 0) continue;
      const loc = {
        x: this.object.location.x + Math.random(),
        y: this.object.location.y + 0.5,
        z: this.object.location.z + Math.random()
      }
      this.overworld.spawnItem(new ItemStack(pointSticks[i].itemId, cout), loc);
    }
    this.points -= dec;
    this.GainPointSticks(this.points);
  }
  public DisplayKillEffect() {
    if (this.killCount === 0) return;
    let str = "";
    let sound = "";
    switch (this.killCount) {
      case 1: str = "キル"; sound = "block.bell.hit";  break;
      case 2: str = "ダブルキル"; sound = "random.explode";  break;
      case 3: str = "トリプルキル"; sound = "mob.horse.skeleton.death"; break;
      case 4: str = "クアドラキル"; sound = "mob.irongolem.death"; break;
      case 5: str = "ペンタキル"; sound = "block.end_portal.spawn"; break;
      default: str = "キルスプリー"; sound = "mob.wither.death"; break;
    }
    world.sendMessage(`§l§a${this.name}§fの§c${str}§f!`);
    this.overworld.runCommand(`playsound ${sound} @a`);
  }
  public DisplayHand(str?: string | null) {
    this.object.runCommand(`title @s actionbar §l手牌: ${str ?? this.hand.displayedString}`);
  }
  public Teleport(loc: Vector3) {
    this.object.teleport(loc);
  }
  public ExposeLocation() {
    if (!this.isParticipat) return;
    if (!this.isRiichi) return;
    if (this.isWinner) return;
    this.object.runCommand(`summon fireworks_rocket ~ ~ ~ `);
  }
  public WinRound() {
    this.isWinner = true;
    this.isRiichi = false;
    this.ChangeGameMode("spectator");
  }
  public EndRound() {
    this.isRiichi = false;
    this.isWinner = false;
  }
  public StopMovement() {
    if (!this.isParticipat) return;
    if (!this.canMove) return;
    this.canMove = false;
    this.object.runCommand(`inputpermission set @s movement disabled`);
  }
  public ResumeMovement() {
    if (!this.isParticipat) return;
    if (this.canMove) return;
    this.canMove = true;
    this.object.runCommand(`inputpermission set @s movement enabled`);
  }
  public ChangeGameMode(mode: string) {
    if (!this.isParticipat) return;
    this.object.runCommand(`gamemode ${mode} @s`);
  }

  // private methods
  private getPunish() { 
    world.sendMessage(`§l${this.name}のチョンボ§fです。\n点数の§6半分§fを§c減点§fします`);
    this.object.playSound("note.bass");
    this.points = Math.floor(this.points / 2 / 100) * 100;
    this.getPointStickSlots().forEach((slot) => { this.cleanInventory(slot); });
    this.GainPointSticks(this.points);
  }
  private getPointStickSlots(): number[] {
    let slots: number[] = [];
    for (let i = 0; i < this.inventorySize; i++) {
      const item = this.inventory.container?.getItem(i);
      if (!item) continue;
      if (!item.getTags().includes("mahjong:point_stick_item")) continue;
      slots.push(i);
    }
    return slots;
  }
  private cleanInventory(slot: number) {
    this.inventory.container?.setItem(slot);
  }
  
  private culculateStickCount(points: number): number[] {
    let remainingPoints = points;
    let stickCount: number[] = [0, 0, 0, 0, 0]

    stickCount[0] = Math.max(0, Math.round(remainingPoints / 10000) - 2);
    remainingPoints -= stickCount[0] * 10000;

    stickCount[1] = (remainingPoints >= 10000) ? ((remainingPoints >= 15000) ? 2 : 1) : 0;
    remainingPoints -= stickCount[1] * 5000;

    stickCount[2] = Math.max(0, Math.floor(remainingPoints / 1000) - 1);
    remainingPoints -= stickCount[2] * 1000;

    stickCount[3] = (remainingPoints >= 500) ? 1 : 0;
    remainingPoints -= stickCount[3] * 500;

    stickCount[4] = Math.round(remainingPoints / 100);

    return stickCount;
  }
}

