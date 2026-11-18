# Prompt da trilha: acid techno

Para gerar a trilha nova (Suno, Udio ou similar). O resultado vai em `audio/trilha.mp3`, no lugar da atual.

Trilha em uso: "Squelching Acid" (dayubneto), ~136,5 BPM, 3min35s.

## Estilo (cole no campo de estilo)

```
acid techno, instrumental, 135 BPM, squelching Roland TB-303 acid bassline with resonant filter sweeps that open and close slowly, punchy distorted 909 four-on-the-floor kick, rolling offbeat open hi-hats, crisp 909 claps on 2 and 4, hypnotic and driving, raw analog warehouse sound, steady energy, seamless loop
```

## Evitar (campo de exclusão, se houver)

```
vocals, lyrics, singing, big room EDM drop, dubstep, trap, long breakdown, silence, piano, orchestral
```

## Por que assim

- **135 BPM**: o deck está calibrado pra esse andamento (`js/audio.js`). Se a música vier em outro BPM, troque o número lá.
- **Kick reto e forte**: é ele que dispara os pulsos do fundo, a onda de choque, o zoom e a aberração cromática. Sem kick claro, a tela fica parada.
- **303 com o filtro abrindo e fechando**: cai na faixa média do analisador e faz os anéis e as ondas respirarem.
- **Sem pausa longa e sem voz**: a trilha toca em loop por baixo da fala. Uma pausa longa deixa o fundo morto no meio da apresentação.
- **3 a 4 minutos, com o fim emendando no começo**, porque o arquivo toca em loop.
