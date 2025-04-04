const socketAuth = require("../middleware/socketAuth");
const { User, Deck, Progression } = require("../sgbd/models");
const Sequelize = require("sequelize");

const activePlayers = [];
let waitingPlayer = null;
const activeGames = new Map();

function getCommonCardType(deck1, deck2) {
  const type1 = deck1[0]?.type;
  const type2 = deck2[0]?.type;

  if (type1 === type2 && (type1 === "film" || type1 === "acteur")) {
    return type1;
  }

  return null;
}

function getStatOptions(type) {
  return type === "film"
    ? ["nb_acteurs", "annee", "genre"]
    : ["nb_films", "nb_genres", "carrer_start"];
}

function shuffle(array) {
  if (!array || !Array.isArray(array)) return [];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getCardValue(card, stat) {
  if (!card || !stat) return 0;

  // Gestion des différents types de statistiques
  switch (stat) {
    case "rarete":
      const rareteMap = { commun: 1, rare: 2, épique: 3, légendaire: 4 };
      return rareteMap[card.rarete?.toLowerCase()] || 1;

    case "genre":
      // Pour le genre de film, compter le nombre de genres comme valeur
      if (typeof card.genre === "string") {
        return card.genre.split(",").length;
      }
      return 1;

    case "annee":
      // Pour l'année, utiliser directement la valeur numérique
      return parseInt(card.annee) || 0;

    case "nb_acteurs":
      // Nombre d'acteurs, valeur numérique
      return parseInt(card.nb_acteurs) || 0;

    case "nb_films":
      // Nombre de films, valeur numérique
      return parseInt(card.nb_films) || 0;

    case "nb_genres":
      // Nombre de genres joués, valeur numérique
      return parseInt(card.nb_genres) || 0;

    case "carrer_start":
    case "Debut de carrière":
      // Début de carrière, valeur numérique
      // Plus petite = meilleure (carrière plus longue)
      const year =
        parseInt(card["carrer_start"] || card["Debut de carrière"]) || 0;
      return year > 0 ? 2025 - year : 0; // Transforme en nombre d'années de carrière

    default:
      // Tenter d'extraire une valeur numérique pour tout autre stat
      const value = parseFloat(card[stat]);
      return isNaN(value) ? 0 : value;
  }
}

function startMatch(player1, player2, io) {
  const deck1 = shuffle([...(player1.deck || [])]);
  const deck2 = shuffle([...(player2.deck || [])]);

  const gameId = `game_${Date.now()}`;
  const gameState = {
    id: gameId,
    players: [player1, player2],
    decks: [deck1, deck2],
    piles: [[], []],
    readyPlayers: [false, false],
    currentType: null,
    currentStat: null,
    drawnCards: [null, null],
  };

  activeGames.set(gameId, gameState);

  player1.socket.emit("gameStart", {
    gameId,
    deckSize: deck1.length,
    opponentDeckSize: deck2.length,
    message: "La partie commence. Cliquez pour piocher une carte.",
  });

  player2.socket.emit("gameStart", {
    gameId,
    deckSize: deck2.length,
    opponentDeckSize: deck1.length,
    message: "La partie commence. Cliquez pour piocher une carte.",
  });

  player1.socket.gameId = gameId;
  player1.socket.playerIndex = 0;
  player2.socket.gameId = gameId;
  player2.socket.playerIndex = 1;
}

function forceNextTurn(game) {
  console.log("Forcing next turn for game:", game.id);

  // Réinitialisez l'état du jeu pour le nouveau tour
  game.drawnCards = [null, null];
  game.readyPlayers = [false, false];
  game.currentType = null;
  game.currentStat = null;

  setTimeout(() => {
    // Vérifiez que le jeu existe toujours avant de continuer
    if (!activeGames.has(game.id)) {
      console.log("Game no longer exists, cannot force next turn");
      return;
    }

    for (let i = 0; i < 2; i++) {
      const sock = game.players[i]?.socket;
      if (!sock) {
        console.log("Player socket not found for index:", i);
        continue;
      }

      // Envoyez un message pour informer que c'est un nouveau tour
      sock.emit("message", {
        message: "Nouveau tour. Cliquez pour piocher une carte.",
      });
    }
  }, 3000); // Augmentez le délai à 3000ms pour donner plus de temps
}

// Correction du problème de nouveau tour après cartes incompatibles
function drawCard(gameId, playerIndex) {
  const game = activeGames.get(gameId);
  if (!game) return { error: "La partie n'existe plus." };

  if (game.drawnCards[playerIndex] !== null) {
    return { error: "Vous avez déjà pioché une carte." };
  }

  if (game.decks[playerIndex].length === 0) {
    return { error: "Vous n'avez plus de cartes." };
  }

  const card = game.decks[playerIndex].shift();
  game.drawnCards[playerIndex] = card;

  // Vérifier si les deux joueurs ont pioché
  if (game.drawnCards[0] && game.drawnCards[1]) {
    const card1 = game.drawnCards[0];
    const card2 = game.drawnCards[1];

    // Vérifier la compatibilité des types
    const commonType = getCommonCardType([card1], [card2]);

    if (!commonType) {
      console.log("Types incompatibles détectés:", card1.type, card2.type);

      // Remettre les cartes dans les decks respectifs
      game.decks[0].push(card1);
      game.decks[1].push(card2);

      // Important: Informer les deux joueurs
      for (let i = 0; i < 2; i++) {
        game.players[i].socket.emit("roundResult", {
          yourCard: game.drawnCards[i],
          opponentCard: game.drawnCards[1 - i],
          stat: null,
          winner: "draw", // Utiliser "draw" pour signaler qu'il n'y a pas de gagnant
          yourDeck: game.decks[i].length,
          opponentDeck: game.decks[1 - i].length,
          message:
            "Les cartes ne sont pas du même type. Nouveau tour dans 3 secondes.",
        });
      }

      // Réinitialiser l'état pour le prochain tour
      setTimeout(() => {
        game.drawnCards = [null, null];
        game.currentType = null;
        game.currentStat = null;

        // Informer les joueurs que c'est un nouveau tour
        for (let i = 0; i < 2; i++) {
          game.players[i].socket.emit("newTurn", {
            message: "Cliquez pour piocher une nouvelle carte",
          });
        }
      }, 3000);

      // Renvoyer un message sans erreur pour ne pas bloquer le flux
      return { card, incompatibleType: true };
    }

    // Si les types sont compatibles, continuer normalement
    const statOptions = getStatOptions(commonType);
    const stat = statOptions[Math.floor(Math.random() * statOptions.length)];

    game.currentType = commonType;
    game.currentStat = stat;

    for (let i = 0; i < 2; i++) {
      game.players[i].socket.emit("statChosen", {
        stat,
        type: commonType,
      });
    }
  }

  return { card };
}
function playCards(gameId) {
  const game = activeGames.get(gameId);
  if (!game) return false;

  const [card1, card2] = game.drawnCards;
  const stat = game.currentStat;
  const type = game.currentType;

  console.log(
    "🃏 Cartes jouées :",
    card1?.nom || card1?.titre,
    card2?.nom || card2?.titre
  );
  console.log("🎯 Stat utilisée :", stat);

  if (!card1 || !card2 || !stat) {
    console.warn("❌ Cartes ou stat manquantes");
    return false;
  }

  // Vérifier le type des cartes
  if (card1.type !== type || card2.type !== type) {
    if (card1.type !== type) game.decks[0].push(card1);
    if (card2.type !== type) game.decks[1].push(card2);

    game.drawnCards = [null, null];
    game.readyPlayers = [false, false];
    game.currentType = null;
    game.currentStat = null;

    // Forcer un nouveau tour après une incompatibilité de type
    forceNextTurn(game);

    return {
      invalidType: true,
      message: "Une des cartes n'est pas du bon type. Nouveau tour.",
    };
  }

  const val1 = getCardValue(card1, stat);
  const val2 = getCardValue(card2, stat);

  console.log("📊 Valeurs comparées :", val1, val2);

  let winner = null;

  // Ajout d'une petite différence aléatoire pour départager en cas d'égalité exacte
  // (seulement si les valeurs sont vraiment égales)
  if (val1 === val2) {
    // Générer un vainqueur aléatoire en cas d'égalité stricte (50/50)
    // Cela réduit considérablement les égalités
    winner = Math.random() < 0.5 ? 0 : 1;
    console.log("⚠️ Égalité exacte, gagnant aléatoire:", winner);
  } else {
    winner = val1 > val2 ? 0 : 1;
  }

  // Attribution des cartes au gagnant
  if (winner === 0) {
    game.decks[0].push(card1, card2);
  } else {
    game.decks[1].push(card1, card2);
  }

  const gameOver = game.decks[0].length === 0 || game.decks[1].length === 0;
  const gameWinner =
    game.decks[0].length === 0 ? 1 : game.decks[1].length === 0 ? 0 : null;

  // Stocker les cartes pour le résultat du round
  const lastDrawnCards = [card1, card2];

  // Réinitialiser
  game.drawnCards = [null, null];
  game.readyPlayers = [false, false];
  game.currentType = null;
  game.currentStat = null;

  return {
    winner,
    gameOver,
    gameWinner,
    stat,
    values: [val1, val2],
    decks: [game.decks[0].length, game.decks[1].length],
    lastDrawnCards,
  };
}

async function endGame(gameId, winnerIndex) {
  const game = activeGames.get(gameId);
  if (!game) return;
  const winner = game.players[winnerIndex];
  const loser = game.players[1 - winnerIndex];

  try {
    // Récupérer les progressions
    const winnerProgression = await Progression.findOne({
      where: { user_id: winner.user.id },
    });

    const loserProgression = await Progression.findOne({
      where: { user_id: loser.user.id },
    });

    if (winnerProgression) {
      // Log pour le débogage
      console.log(
        "Ancien argent du gagnant:",
        winnerProgression.argent_virtuel
      );

      // Mise à jour directe
      winnerProgression.argent_virtuel = Progression.update(
        { argent_virtuel: Sequelize.literal("argent_virtuel + 25") },
        { where: { user_id: winner.user.id } }
      );

      console.log(
        "Nouvel argent du gagnant:",
        winnerProgression.argent_virtuel
      );
    } else {
      console.error("Progression du gagnant non trouvée");
    }

    if (loserProgression) {
      loserProgression.argent_virtuel = Progression.update(
        { argent_virtuel: Sequelize.literal("argent_virtuel + 5") },
        { where: { user_id: loser.user.id } }
      );
    } else {
      console.error("Progression du perdant non trouvée");
    }
  } catch (err) {
    console.error("Erreur mise à jour progression:", err.message);
    // Afficher la stack trace pour le débogage
    console.error(err.stack);
  }

  winner.socket.emit("result", { result: "win", gold: 25 });
  loser.socket.emit("result", { result: "lose", gold: 5 });

  activeGames.delete(gameId);
}

function initCombat(io) {
  socketAuth(io);

  io.on("connection", (socket) => {
    socket.on("join", async () => {
      try {
        const userId = socket.userId;
        const user = await User.findByPk(userId);
        if (!user)
          return socket.emit("error", { message: "Utilisateur introuvable" });

        const userDeckData = await Deck.findOne({ where: { user_id: userId } });
        const deck = userDeckData.cards;

        const player = { socket, user, deck };

        if (!waitingPlayer) {
          waitingPlayer = player;
          socket.emit("waiting", { message: "En attente d'un joueur..." });
        } else {
          const opponent = waitingPlayer;
          waitingPlayer = null;
          startMatch(player, opponent, io);
        }
      } catch (err) {
        console.error(err);
        socket.emit("error", {
          message: "Erreur lors de la récupération du deck",
        });
      }
    });

    socket.on("drawCard", () => {
      const gameId = socket.gameId;
      const playerIndex = socket.playerIndex;

      if (!gameId || playerIndex === undefined) {
        socket.emit("error", { message: "Vous n'êtes pas dans une partie" });
        return;
      }

      const result = drawCard(gameId, playerIndex);
      if (result.error) return socket.emit("error", { message: result.error });

      const game = activeGames.get(gameId);
      socket.emit("cardDrawn", {
        yourCard: result.card,
        stat: game.currentStat,
        yourDeck: game.decks[playerIndex].length,
      });

      const opponentIndex = 1 - playerIndex;
      const opponentSocket = game.players[opponentIndex].socket;

      opponentSocket.emit("opponentDrawn", {
        drawn: true,
        opponentDeck: game.decks[playerIndex].length,
      });

      if (game.drawnCards[0] && game.drawnCards[1]) {
        const playResult = playCards(gameId);
        if (!playResult || !playResult.values) {
          socket.emit("error", {
            message: "Erreur lors de l'évaluation du tour.",
          });
          return;
        }

        for (let i = 0; i < 2; i++) {
          const playerSocket = game.players[i].socket;
          const opponentIndex = 1 - i;

          playerSocket.emit("roundResult", {
            yourCard: playResult.lastDrawnCards[i],
            opponentCard: playResult.lastDrawnCards[opponentIndex],
            stat: playResult.stat,
            yourValue: playResult.values[i],
            opponentValue: playResult.values[opponentIndex],
            winner:
              playResult.winner === i
                ? "you"
                : playResult.winner === null
                ? "draw"
                : "opponent",
            yourDeck: playResult.decks[i],
            opponentDeck: playResult.decks[opponentIndex],
            message: playResult.invalidType
              ? "Une des cartes n'est pas du bon type. Nouveau tour."
              : playResult.winner === i
              ? "Vous gagnez ce tour !"
              : playResult.winner === null
              ? "Égalité !"
              : "Vous perdez ce tour...",
          });
        }

        if (playResult.gameOver) {
          endGame(gameId, playResult.gameWinner);
        }
      }
    });

    socket.on("disconnect", () => {
      // Si le joueur déconnecté est celui qui attend un adversaire
      if (waitingPlayer && waitingPlayer.socket === socket) {
        console.log("Joueur en attente déconnecté");
        waitingPlayer = null;
        return;
      }

      // Si le joueur déconnecté est dans une partie active
      const gameId = socket.gameId;
      if (gameId) {
        console.log(`Joueur déconnecté de la partie ${gameId}`);
        const game = activeGames.get(gameId);

        if (game) {
          const playerIndex = socket.playerIndex;
          if (playerIndex === undefined) {
            console.error("Index du joueur inconnu");
            return;
          }

          const opponentIndex = 1 - playerIndex;
          const opponentSocket = game.players[opponentIndex]?.socket;

          // Vérifier que l'adversaire est toujours connecté
          if (opponentSocket && opponentSocket.connected) {
            console.log(
              `Informer l'adversaire (joueur ${opponentIndex}) de la déconnexion`
            );

            // Informer l'adversaire de la déconnexion
            opponentSocket.emit("opponentLeft", {
              message: "Votre adversaire a quitté la partie",
            });

            // Attribuer la victoire à l'adversaire
            opponentSocket.emit("result", {
              result: "win",
              gold: 25,
              forfeit: true,
            });

            // Mettre à jour l'argent de l'adversaire dans la BDD
            try {
              const winnerId = game.players[opponentIndex].user.id;
              console.log(
                `Mise à jour de l'argent pour le joueur ${winnerId} (victoire par forfait)`
              );

              // Utiliser la méthode findOne puis save pour être sûr que la mise à jour fonctionne
              Progression.update(
                { argent_virtuel: Sequelize.literal("argent_virtuel + 25") },
                { where: { user_id: winnerId } }
              )
                .then(() => {
                  console.log(
                    `Argent mis à jour avec succès pour le joueur ${winnerId}`
                  );
                })
                .catch((err) => {
                  console.error(
                    `Erreur lors de la mise à jour de l'argent: ${err.message}`
                  );
                });
            } catch (err) {
              console.error(
                `Exception lors de la mise à jour de l'argent: ${err.message}`
              );
            }
          } else {
            console.log(
              "L'adversaire s'est également déconnecté ou est introuvable"
            );
          }

          // Supprimer la partie
          console.log(`Suppression de la partie ${gameId}`);
          activeGames.delete(gameId);
        } else {
          console.log(`La partie ${gameId} n'existe plus`);
        }
      }
    });
  });
}

module.exports = { initCombat };
