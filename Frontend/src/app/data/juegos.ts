import { Juego } from '../models/juego';

export const JUEGOS: readonly Juego[] = [
  {
    id: 'fortnite',
    titulo: 'Fortnite',
    desarrollador: 'Epic Games',
    lanzamiento: 2017,
    generos: ['Acción', 'Battle royale'],
    plataformas: ['PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X|S', 'Switch'],
    peso: '30 GB',
    sinopsis:
      'Battle royale gratuito: cien jugadores caen a una isla, buscan armas y materiales y compiten hasta que queda uno solo. Se puede construir estructuras en plena partida y el juego se renueva con temporadas, eventos en vivo y colaboraciones. Además de las partidas clásicas, tiene modos creativos hechos por la comunidad.',
    portada:
      'https://fortnite-api.com/images/cosmetics/br/cid_349_athena_commando_m_banana/featured.png',
  },
  {
    id: 'league-of-legends',
    titulo: 'League of Legends',
    desarrollador: 'Riot Games',
    lanzamiento: 2009,
    generos: ['Estrategia', 'MOBA'],
    plataformas: ['PC', 'Mac'],
    peso: '20 GB',
    sinopsis:
      'MOBA por equipos: dos equipos de cinco campeones se enfrentan en la Grieta del Invocador y gana el que destruye primero el Nexo rival. Tiene más de 160 campeones con habilidades propias, así que cada partida se juega distinto. Es gratuito y uno de los juegos con más jugadores y torneos del mundo.',
    portada: 'https://ddragon.leagueoflegends.com/cdn/img/champion/loading/Jinx_0.jpg',
  },
  {
    id: 'counter-strike-2',
    titulo: 'Counter-Strike 2',
    desarrollador: 'Valve',
    lanzamiento: 2023,
    generos: ['Acción', 'Shooter'],
    plataformas: ['PC'],
    peso: '85 GB',
    sinopsis:
      'Shooter táctico en primera persona: terroristas contra antiterroristas en rondas cortas donde cada decisión y cada bala cuentan. Se juega online en modo competitivo, casual y duelos, y tiene una de las escenas de esports más grandes del mundo. Es gratuito.',
    steamAppId: 730,
  },
  {
    id: 'valorant',
    titulo: 'Valorant',
    desarrollador: 'Riot Games',
    lanzamiento: 2020,
    generos: ['Acción', 'Shooter'],
    plataformas: ['PC', 'PS5', 'Xbox Series X|S'],
    peso: '25 GB',
    sinopsis:
      'Shooter táctico 5 contra 5 donde cada agente tiene habilidades únicas. Un equipo ataca y planta una bomba, el otro defiende, y la ronda se gana con puntería, coordinación y buen uso de las habilidades. Es gratuito y lo desarrolla Riot Games, la creadora de League of Legends.',
    portada:
      'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/fullportrait.png',
  },
  {
    id: 'grand-theft-auto-v',
    titulo: 'Grand Theft Auto V',
    desarrollador: 'Rockstar North',
    lanzamiento: 2013,
    generos: ['Acción', 'Aventura'],
    plataformas: ['PC', 'PS3', 'PS4', 'PS5', 'Xbox 360', 'Xbox One', 'Xbox Series X|S'],
    peso: '125 GB',
    sinopsis:
      'Los Santos, una ciudad inspirada en Los Ángeles. Michael, Franklin y Trevor, tres criminales muy distintos, se juntan para planear golpes cada vez más grandes. Incluye GTA Online, el modo multijugador que sigue activo desde hace más de diez años.',
    steamAppId: 271590,
  },
  {
    id: 'elden-ring',
    titulo: 'Elden Ring',
    desarrollador: 'FromSoftware',
    lanzamiento: 2022,
    generos: ['Acción', 'Rol'],
    plataformas: ['PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X|S'],
    peso: '60 GB',
    sinopsis:
      'RPG de acción de mundo abierto creado por FromSoftware, con un universo escrito junto a George R. R. Martin. Recorrés las Tierras Intermedias a pie y a caballo, te enfrentás a jefes enormes y armás tu personaje a tu manera. Es exigente: aprender de cada derrota es parte del juego.',
    steamAppId: 1245620,
  },
  {
    id: 'red-dead-redemption-2',
    titulo: 'Red Dead Redemption 2',
    desarrollador: 'Rockstar Games',
    lanzamiento: 2018,
    generos: ['Acción', 'Aventura'],
    plataformas: ['PC', 'PS4', 'Xbox One'],
    peso: '150 GB',
    sinopsis:
      'Estados Unidos, 1899: la banda de Dutch van der Linde huye de la ley tras un asalto fallido. Jugás como Arthur Morgan, un forajido de la banda, en un Lejano Oeste abierto y lleno de detalles, con cacería, campamento y decisiones que pesan.',
    steamAppId: 1174180,
  },
  {
    id: 'the-witcher-3',
    titulo: 'The Witcher 3: Wild Hunt',
    desarrollador: 'CD PROJEKT RED',
    lanzamiento: 2015,
    generos: ['Rol'],
    plataformas: ['PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X|S', 'Switch'],
    peso: '60 GB',
    sinopsis:
      'Sos Geralt de Rivia, un brujo que caza monstruos por encargo, y buscás a Ciri, tu hija adoptiva, perseguida por la Cacería Salvaje. Un mundo abierto enorme, misiones con historias propias y decisiones que cambian el rumbo de la trama.',
    steamAppId: 292030,
  },
  {
    id: 'cyberpunk-2077',
    titulo: 'Cyberpunk 2077',
    desarrollador: 'CD PROJEKT RED',
    lanzamiento: 2020,
    generos: ['Rol'],
    plataformas: ['PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X|S'],
    peso: '70 GB',
    sinopsis:
      'Night City, una megalópolis obsesionada con el poder y la tecnología. Jugás como V, un mercenario que busca un implante que promete la inmortalidad, con Johnny Silverhand, interpretado por Keanu Reeves, instalado en tu cabeza.',
    steamAppId: 1091500,
  },
  {
    id: 'baldurs-gate-3',
    titulo: "Baldur's Gate 3",
    desarrollador: 'Larian Studios',
    lanzamiento: 2023,
    generos: ['Rol', 'Aventura', 'Estrategia'],
    plataformas: ['PC', 'Mac', 'PS5', 'Xbox Series X|S'],
    peso: '150 GB',
    sinopsis:
      'RPG por turnos basado en las reglas de Dungeons & Dragons. Un parásito en tu cabeza te empuja a armar un grupo, recorrer Faerûn y decidir cómo termina la historia. Se puede jugar solo o en cooperativo de hasta cuatro personas.',
    steamAppId: 1086940,
  },
  {
    id: 'god-of-war',
    titulo: 'God of War',
    desarrollador: 'Santa Monica Studio',
    lanzamiento: 2018,
    generos: ['Acción', 'Aventura'],
    plataformas: ['PC', 'PS4', 'PS5'],
    peso: '70 GB',
    sinopsis:
      'Kratos, lejos de Grecia, vive en los reinos nórdicos con su hijo Atreus. Tras la muerte de su esposa, los dos emprenden un viaje para cumplir su último deseo: esparcir sus cenizas en la cima más alta. Combate cuerpo a cuerpo con el hacha Leviatán y una historia sobre ser padre.',
    steamAppId: 1593500,
  },
  {
    id: 'hades',
    titulo: 'Hades',
    desarrollador: 'Supergiant Games',
    lanzamiento: 2020,
    generos: ['Acción', 'Indie', 'Rol'],
    plataformas: ['PC', 'Mac', 'Switch', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X|S'],
    peso: '15 GB',
    sinopsis:
      'Roguelike de acción: Zagreo, hijo de Hades, intenta escapar del Inframundo una y otra vez. Cada intento termina en derrota, pero te deja más fuerte y con más historia por descubrir. Combates rápidos y mucha rejugabilidad.',
    steamAppId: 1145360,
  },
  {
    id: 'stardew-valley',
    titulo: 'Stardew Valley',
    desarrollador: 'ConcernedApe',
    lanzamiento: 2016,
    generos: ['Indie', 'Rol', 'Simuladores'],
    plataformas: ['PC', 'Mac', 'Linux', 'Switch', 'PS4', 'Xbox One', 'iOS', 'Android'],
    peso: '500 MB',
    sinopsis:
      'Simulador de granja: heredás el terreno de tu abuelo y lo transformás a tu ritmo. Cultivás, pescás, explorás minas, criás animales y hacés amistad con los vecinos del pueblo. Se puede jugar solo o en cooperativo.',
    steamAppId: 413150,
  },
  {
    id: 'hollow-knight',
    titulo: 'Hollow Knight',
    desarrollador: 'Team Cherry',
    lanzamiento: 2017,
    generos: ['Acción', 'Aventura', 'Indie'],
    plataformas: ['PC', 'Mac', 'Linux', 'Switch', 'PS4', 'Xbox One'],
    peso: '9 GB',
    sinopsis:
      'Metroidvania 2D dibujado a mano. Un pequeño caballero desciende a Hallownest, un reino de insectos en ruinas bajo tierra, para descubrir qué lo consumió. Exploración libre, combates precisos y muchísima atmósfera.',
    steamAppId: 367520,
  },
];
