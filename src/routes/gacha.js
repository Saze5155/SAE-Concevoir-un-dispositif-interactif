const express = require("express");
const router = express.Router();
const {
  Progression,
  Actors,
  Movies,
  User,
  MoviesActors,
  CompletedFilms,
} = require("../sgbd/models.js");
const auth = require("../middleware/auth.js");

const DRAW_COST = 100;

const dropRates = {
  Commun: 65,
  Rare: 20,
  Épique: 5,
  Légendaire: 0.1,
};

function getRandomRarity(godPack = false) {
  if (godPack) {
    return Math.random() < 0.5 ? "Épique" : "Légendaire";
  }
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const [rarity, rate] of Object.entries(dropRates)) {
    cumulative += rate;
    if (rand <= cumulative) return rarity;
  }
  return "Commun";
}

async function drawCard(godPack, userId) {
  const type = Math.random() < 0.5 ? "acteur" : "film";
  const rarity = getRandomRarity(godPack);

  let pool;
  if (type === "acteur") {
    pool = await Actors.findAll({ where: { rarete: rarity } });
    if (pool.length === 0) return null;

    const random = pool[Math.floor(Math.random() * pool.length)];
    const nbFilms = await MoviesActors.count({
      where: { id_actor: random.id },
    });
    return {
      id: random.id,
      type,
      rarete: rarity,
      nom: random.name,
      nb_films: nbFilms,
    };
  } else {
    pool = await Movies.findAll({ where: { rarete: rarity } });
    const random = pool[Math.floor(Math.random() * pool.length)];

    const alreadyCompleted = await CompletedFilms.findOne({
      where: { user_id: userId, movie_id: random.id },
    });

    return {
      id: random.id,
      type,
      rarete: rarity,
      titre: random.title,
      affiche: !!alreadyCompleted, // 💡 important !
    };
  }
}

function addCardToCollection(collection, card) {
  const index = collection.findIndex(
    (c) => c.id === card.id && c.type === card.type
  );

  if (index !== -1) {
    collection[index].count += 1;
  } else {
    collection.push({ ...card, count: 1 });
  }
  return collection;
}

// Route POST /gacha/draw
router.post("/draw", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Vérifier si la progression existe
    let progression = await Progression.findOne({ where: { user_id: userId } });

    if (!progression) {
      progression = await Progression.create({
        user_id: userId,
        argent_virtuel: 0,
        cartes_obtenues: "[]",
        dernier_tirage: new Date(),
      });
    }

    if (progression.argent_virtuel < DRAW_COST) {
      return res
        .status(403)
        .json({ message: "Pas assez de monnaie pour tirer." }); // 403 pour fonds insuffisants
    }

    // 1% chance de god pack
    const isGodPack = Math.random() < 0.01;
    const newCards = [];

    for (let i = 0; i < 10; i++) {
      const card = await drawCard(isGodPack, userId);
      if (card) newCards.push(card);
    }

    let collection = [];
    if (progression && progression.cartes_obtenues) {
      collection = JSON.parse(progression.cartes_obtenues);
    }

    for (const card of newCards) {
      const index = collection.findIndex(
        (c) => c.id === card.id && c.type === card.type
      );

      if (index !== -1) {
        collection[index].count += 1;
      } else {
        collection.push({ ...card, count: 1 });
      }
    }

    await Progression.update(
      {
        cartes_obtenues: JSON.stringify(collection),
        dernier_tirage: new Date(),
        argent_virtuel: progression.argent_virtuel - DRAW_COST, // 💸 on déduit 100
      },
      {
        where: { user_id: userId },
      }
    );

    res.status(200).json({
      message: isGodPack ? "✨ GOD PACK obtenu ! ✨" : "Tirage réussi.",
      tirage: newCards,
    }); // 200 pour succès
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." }); // 500 pour erreur serveur
  }
});

module.exports = router;
