scoreboard objectives add anti_x dummy
scoreboard objectives add anti_y dummy
scoreboard objectives add anti_z dummy
scoreboard objectives add anti_r dummy
scoreboard objectives add anti_xn dummy
scoreboard objectives add anti_yn dummy
scoreboard objectives add anti_zn dummy
scoreboard objectives add anti_rn dummy
scoreboard objectives add anti_time dummy
scoreboard objectives add anti_ratio dummy
scoreboard objectives add anti_type dummy
scoreboard objectives add anti_p dummy
scoreboard objectives add anti_color_r dummy
scoreboard objectives add anti_color_g dummy
scoreboard objectives add anti_color_b dummy
scoreboard objectives add anti_color_a dummy
scoreboard objectives add anti_menu dummy
scoreboard players add @s anti_x 0
scoreboard players add @s anti_y 0
scoreboard players add @s anti_z 0
scoreboard players add @s anti_r 1000
scoreboard players add @s anti_xn 0
scoreboard players add @s anti_yn 0
scoreboard players add @s anti_zn 0
scoreboard players add @s anti_rn 0
scoreboard players add @s anti_time 0
scoreboard players add @s anti_ratio 0
scoreboard players add @s anti_type 0
scoreboard players add @s anti_color_r 64
scoreboard players add @s anti_color_g 256
scoreboard players add @s anti_color_b 64
scoreboard players add @s anti_color_a 100
gamerule sendcommandfeedback false
scoreboard objectives setdisplay sidebar anti_menu
tag @s add anti_menu
tickingarea add ~~~ ~~5~ anti