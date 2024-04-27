import { world, Vector3, Player } from "@minecraft/server";
import { Knight } from "../knight/knight";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";

enum Direction {
  S = 2,
  N = 3,
  E = 4,
  W = 5
}
enum Axis {
  x = "x",
  z = "z"
}

export default class WorldBorder {
  private overworld = world.getDimension("overworld");
  private worldBorderBlockId = "mahjong:world_border_block";
  private borderRadius: number = 3;
  private borderSize: number = this.borderRadius * 2 + 1;
  private borderVisibleDistance: number = 4;
  
  private interval = 20;
  private count = 0;

  public AddDebuff(knights: Knight[], areaRadius: number, centerOfMap?: Vector3) {
    
    if (this.count++ < this.interval) return;
    if (!centerOfMap) {
      this.overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7[ERROR] WorldBorder.AddDebuff: centerOfMap is not defined."}]}`);
      return;
    }
    for (const knight of knights) {
      if (!knight.isParticipat) continue;
      if (knight.isWinner) continue;
      const pos = knight.object.location;
      const distance = Math.sqrt((pos.x - centerOfMap.x) ** 2 + (pos.z - centerOfMap.z) ** 2);
      if (distance < areaRadius) continue;
      this.giveDebuff(knight.object);
    }
    this.count = 0;
  }
  private giveDebuff(player: Player) {
    player.addEffect(MinecraftEffectTypes.Wither, 30, {amplifier: 1, showParticles: false});
    player.addEffect(MinecraftEffectTypes.Blindness, 30, {amplifier: 1, showParticles: false});

  }
  // public DisplayBorder(knights: Knight[]) {
  //   if (this.count++ < this.interval) return; 
  //   for (const knight of knights) {
  //     const pos = knight.object.location;
  //     const posX = Math.round(pos.x - 0.5);
      // const posY = Math.round(pos.y - 0.5);
      // const posZ = Math.round(pos.z - 0.5);
      // const posX_abs = Math.abs(posX);
      // const posZ_abs = Math.abs(posZ);
      // const defX = posX- this.centerOfMap.x;
      // const defZ = posZ- this.centerOfMap.z;
      // const defX_abs = Math.abs(defX);
      // const defZ_abs = Math.abs(defZ);
      // const playerDir = this.getPlayerDirection(defX, defZ);
      // const playerAxis = this.getPlayerAxis(defX_abs, defZ_abs);
      // const maxVisibleDist = this.areaRadius + this.borderVisibleDistance;
      // const minVisibleDist = this.areaRadius - this.borderVisibleDistance;
      // let borderPos: Vector3 = {
      //   x: this.areaRadius * (0 < defX ? 1 : -1), 
      //   y: posY, 
      //   z: this.areaRadius * (0 < defZ ? 1 : -1)
      // };

      // if (this.areaRadius < posX_abs || this.areaRadius < posZ_abs) { this.giveDebuff(player); }
  //   }
  //   this.count = 0;
  // }

  // private spawnBorder(refPoint: Vector3, playerDir: Direction, playerAxis: Axis) {
  //   const oppossiteAxis = this.getOppositeAxis(playerAxis);

  //   if (Math.abs(refPoint[oppossiteAxis]) <= this.areaRadius - this.borderRadius) {
  //     const operationAreaRadius = this.borderRadius;
  //     // const operationAreaRadius = this.borderRadius + 1;
  //     for (let i = -operationAreaRadius; i <= operationAreaRadius; i++) {
  //       const isOutside = Math.abs(i) === operationAreaRadius;
  //       let particlePos: Vector3 = {x: refPoint.x, y: refPoint.y, z: refPoint.z}
  //       particlePos[oppossiteAxis] += i;
  //       this.setBlocks(particlePos, playerDir, isOutside);
  //     }
  //   } else {
  //     this.setBlocks(refPoint, playerDir);
  //     world.sendMessage(`                                ここにはボーダーを表示しません`);
  //   }
  // } 
  
  // private setBlocks(referencePoint: Vector3, playerDir: Direction, isOutside: boolean = false) {
  //   for (let i = 0; i < this.borderSize; i++) {
  //     world.getDimension("overworld").spawnParticle("mahjong:world_border_particle", {
  //       x: referencePoint.x + 0.5,
  //       y: referencePoint.y + i + 0.5,
  //       z: referencePoint.z + 0.5
  //     });
  //   }
  // }
  // private getPlayerDirection(defX: number, defZ: number): Direction {
  //   if (Math.abs(defZ) < Math.abs(defX) ) {
  //     return (0 < defX) ? Direction.E : Direction.W;
  //   } else {
  //     return (0 < defZ) ? Direction.S : Direction.N;
  //   }
  // }
  // private getPlayerAxis(defX_abs: number, defZ_abs: number): Axis {
  //   return (defZ_abs < defX_abs) ? Axis.x : Axis.z;
  // }
  // private getOppositeAxis(playerAxis: Axis): Axis {
  //   return (playerAxis === Axis.x) ? Axis.z : Axis.x;
  // }
}