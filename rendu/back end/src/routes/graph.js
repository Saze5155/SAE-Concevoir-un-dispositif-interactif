const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  Progression,
  Movies,
  Actors,
  MoviesActors,
  GuessedActors,
} = require("../sgbd/models");

router.get("/", auth, async (req, res) => {
  const userId = req.user.id;

  const progression = await Progression.findOne({
    where: { user_id: userId },
  });

  if (!progression || !progression.cartes_obtenues) {
    return res.status(404).json({ message: "Aucune progression trouvée" });
  }

  const cards = JSON.parse(progression.cartes_obtenues);
  const ownedActors = cards.filter((c) => c.type === "acteur").map((c) => c.id);
  const ownedMovies = cards.filter((c) => c.type === "film").map((c) => c.id);

  const guessed = await GuessedActors.findAll({
    where: { user_id: userId },
  });

  const nodes = [
    ...ownedActors.map((id) => ({ id, type: "acteur" })),
    ...ownedMovies.map((id) => ({ id, type: "film" })),
  ];

  const links = [];

  for (const g of guessed) {
    if (ownedActors.includes(g.actor_id) && ownedMovies.includes(g.movie_id)) {
      links.push({ source: g.actor_id, target: g.movie_id });
    }
  }

  // Récupère les noms pour les labels
  const actorModels = await Actors.findAll({ where: { id: ownedActors } });
  const movieModels = await Movies.findAll({ where: { id: ownedMovies } });

  const actorNames = Object.fromEntries(actorModels.map((a) => [a.id, a.name]));
  const movieNames = Object.fromEntries(
    movieModels.map((m) => [m.id, m.title])
  );

  // Ajoute le nom aux nœuds
  for (const node of nodes) {
    node.name =
      node.type === "acteur"
        ? actorNames[node.id] || "?"
        : movieNames[node.id] || "?";
  }

  res.json({ nodes, links });
});

module.exports = router;
