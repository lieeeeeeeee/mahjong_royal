import { world, system, Player, EntityQueryOptions, Block, Entity } from "@minecraft/server";
import Mahjong from "./mahjong/mahjong";
import { Shoupai, Util } from '@kobalab/majiang-core';

type Interactor = { playerName: string, blockId: string };
const mahjong = new Mahjong();
const overworld = world.getDimension("overworld");
let interactors: Interactor[] = [];

system.runInterval(() => {
  mahjong.game.Update();
});
// 待機リストにいるプレイヤーをゲームに参加させる
system.runInterval(() => {
  mahjong.JoinPlayer();
}, 20);
// インタラクトリストを初期化する
system.runInterval(() => {
  interactors = [];
}, 10);
// MARK: On player command
system.afterEvents.scriptEventReceive.subscribe((event) => {
  runCommand(event.message.split(" "), event.sourceEntity);
});
// MARK: On player chatSend
world.afterEvents.chatSend.subscribe((event) => {
  runCommand(event.message.split(" "), event.sender);
});
function runCommand(command: string[], sender?: Entity) {
  if (sender && sender.typeId === "player" && !(sender as Player).isOp()) {
    (sender as Player).sendMessage("§o> §7You are not an operator");
    overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7[ERROR] Player §c${(sender as Player).name} §7is not an operator"}]}`);
    return;
  }
  overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Received command: §c${command.join(" ")}"}]}`);
  switch (command[0]) {
    case "!initialize":
      mahjong.game.Init();
      break;
    case "!changePlayerMode":
      if (!command[1]) { overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7[ERROR] Selecter is not found"}]}`);  return; }
      mahjong.ChangePlayerMode(command[1]);
      break;
    case "!startGame":
      mahjong.game.isStarted = true;
      break;
    case "!endGame":
      mahjong.game.End();
      break;
    case "!test":
      mahjong.Test();
      mahjong.game.Test();
      break;
    case "!join":
      if (!command[1]) { overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7[ERROR] Selecter is not found"}]}`);  return; }
      mahjong.OnPlayerJoin(command[1]);
      break;
    case "!leave":
      if (!command[1]) { overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7[ERROR] Selecter is not found"}]}`);  return; }
      mahjong.LeavePlayer(command[1]);
      break;
    case "!system":
      if (!sender) return;
      (sender as Player).runCommand(`tp @s @e[type=minecraft:armor_stand,name=system]`);
      break;
    default:
      if (!command[1]) { overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7[ERROR] Command §c${command[0]} §7not found"}]}`);  return; }
      break;
  }
}
//MARK: On player join
world.afterEvents.playerJoin.subscribe((event) => {
  overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Player joined: §c${event.playerName}"}]}`);
  mahjong.OnPlayerJoin(event.playerName);
});
//MARK: On player leave
world.afterEvents.playerLeave.subscribe((event) => {
  overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Player left: §c${event.playerName}"}]}`);
  mahjong.LeavePlayer(event.playerName);
});
//MARK: On player spawn
world.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Player spawned: §c${player.name}"}]}`);
  mahjong.game.OnKnightSpawn(player);
});
// MARK: On entity die
world.afterEvents.entityDie.subscribe((event) => {
  const entityId = event.deadEntity.typeId;
  overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Entity died: §c${entityId}"}]}`);
  switch (entityId) {
    case "minecraft:player":
      const deadPlayer = event.deadEntity as Player;
      const killer = event.damageSource.damagingEntity as Player;
      overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Player died: §c${deadPlayer.name}"}]}`);
      mahjong.game.OnKnightDie(deadPlayer, killer);
      break;
    default:
      break;
  }
});
//MARK: On player interact with block
world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const player = event.player;
  const block = event.block;
  const blockTags = block.getTags();
  const blockId = block.permutation.type.id;
  const item = event.itemStack?.type.id as string;
  const itemTags = event.itemStack?.getTags();

  // interactorsに登録された値と一致するものがあればreturn
  if (interactors.some(interactor => interactor.playerName === player.name && interactor.blockId === blockId)) return;
  overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7${player.name} interacted with item: §c${item} (${itemTags})"}]}`);
  interactors.push({ playerName: player.name, blockId: blockId });

  blockTags.forEach(blockTag => {
    switch (blockTag) {
      case "mahjong:tile_block":
        itemTags?.forEach(itemTag => {
          switch (itemTag) {
            case "mahjong:tile_item":
              mahjong.game.OnKnightInteractWithBlock(player, block, item);
              break;
            case "mahjong:winning_stick":
              mahjong.game.OnKnightUseWinningStick(player, block);
              break;
            default:
              overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Item tag: §c${itemTag} §7not found"}]}`);
              break;
          }
        });
        break;
      case "metal":
        
        overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Block id: §c${blockId} §7is metal"}]}`);
        if (blockId === "minecraft:iron_door") {
          if (!player.isOp()) {
            player.sendMessage("§o> §7OP権限が必要です");
            overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7[ERROR] Player §c${player.name} §7is not an operator"}]}`);
            return;
          }
          player.runCommand(`tp @s ^ ^ ^2.5`);
        }
        break;
      default:
        overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Block tag: §c${blockTag} §7not found"}]}`);
        break;
    }
  });
});
//MARK: On Item Use
world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const itemNameTag = event.itemStack.nameTag;
  const itemId = event.itemStack.type.id;
  const itemTags = event.itemStack.getTags();
  overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7${player.name} used item: §c${itemId} (${itemTags})"}]}`);
  itemTags.forEach(itemTag => {
    switch (itemTag) {
      case "mahjong:point_stick_item":
        mahjong.game.OnKnightUsePointStick(player, itemId);
        break;
      default:
        overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Item tag: §c${itemTag} §7not found"}]}`);
        break;
    }
  });
  switch (itemId) {
    case "minecraft:clock":
      mahjong.Test(player);
      break;
    
    default:
      overworld.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text": "§o> §7Item: §c${itemId}(${itemNameTag}) §7not found"}]}`);
      break;
  }
});

