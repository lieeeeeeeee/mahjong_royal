#score setup
execute as @e[tag=!anti_setup,name=system] run function anti_setup
execute as @e[tag=!anti_setup,name=system] run tag @s add anti_setup

#Actor_property
event entity @a property_set

#Player score
scoreboard players operation @a anti_x = @e[name=system] anti_x
scoreboard players operation @a anti_y = @e[name=system] anti_y
scoreboard players operation @a anti_z = @e[name=system] anti_z
scoreboard players operation @a anti_r = @e[name=system] anti_r
scoreboard players operation @a anti_xn = @e[name=system] anti_xn
scoreboard players operation @a anti_yn = @e[name=system] anti_yn
scoreboard players operation @a anti_zn = @e[name=system] anti_zn
scoreboard players operation @a anti_rn = @e[name=system] anti_rn
scoreboard players operation @a anti_time = @e[name=system] anti_time
scoreboard players operation @a anti_ratio = @e[name=system] anti_ratio
scoreboard players operation @a anti_type = @e[name=system] anti_type
scoreboard players operation @a anti_color_r = @e[name=system] anti_color_r
scoreboard players operation @a anti_color_g = @e[name=system] anti_color_g
scoreboard players operation @a anti_color_b = @e[name=system] anti_color_b
scoreboard players operation @a anti_color_a = @e[name=system] anti_color_a

#anti_menu
execute as @e[tag=anti_menu,name=system] run function anti_menu
