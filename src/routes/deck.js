const express = require("express");
const router = express.Router();
const {
  Progression,
  Actors,
  Movies,
  CompletedFilms,
  MoviesActors,
  MoviesGenre,
  Genre,
  Deck,
} = require("../sgbd/models");
const auth = require("../middleware/auth");

router.post("/save", auth, async (req, res) => {
  const userId = req.user.id;
  const { deck } = req.body;

  if (!Array.isArray(deck) || deck.length !== 15) {
    return res
      .status(422)
      .json({ message: "Le deck doit contenir exactement 15 cartes." }); // 422 pour deck invalide
  }

  try {
    // Vérifie si un deck existe déjà
    const existingDeck = await Deck.findOne({ where: { user_id: userId } });

    if (existingDeck) {
      // Mise à jour du deck existant
      await Deck.update(
        { cards: JSON.stringify(deck) },
        { where: { user_id: userId } }
      );
    } else {
      // Création d’un nouveau deck
      await Deck.create({
        user_id: userId,
        cards: JSON.stringify(deck),
      });
    }

    res.status(200).json({ message: "Deck sauvegardé avec succès." }); // 200 pour succès
  } catch (err) {
    console.error("Erreur lors de la sauvegarde du deck:", err);
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la sauvegarde du deck." }); // 500 pour erreur serveur
  }
});

module.exports = router;
