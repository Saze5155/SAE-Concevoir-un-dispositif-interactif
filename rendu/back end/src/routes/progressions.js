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
} = require("../sgbd/models");
const auth = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  const progression = await Progression.findOne({
    where: { user_id: req.user.id },
  });

  if (!progression) {
    return res.status(404).json({ message: "Progression non trouvée" });
  }

  res.json({
    argent_virtuel: progression.argent_virtuel,
  });
});

router.get("/collection", auth, async (req, res) => {
  try {
    const progression = await Progression.findOne({
      where: { user_id: req.user.id },
    });

    if (!progression || !progression.cartes_obtenues) {
      return res.status(404).json({ message: "Progression non trouvée" });
    }

    const rawCollection = JSON.parse(progression.cartes_obtenues);

    // Utiliser reduce au lieu de la boucle for pour grouper les cartes
    const grouped = rawCollection.reduce((acc, card) => {
      const key = `${card.id}-${card.type}`;
      if (!acc[key]) {
        acc[key] = {
          id: card.id,
          type: card.type,
          count: card.count || 1,
        };
      } else {
        acc[key].count++;
      }
      return acc;
    }, {});

    // Traiter les requêtes en parallèle avec Promise.all
    const enrichedCollection = await Promise.all(
      Object.values(grouped).map(async (card) => {
        if (card.type === "acteur") {
          const actor = await Actors.findByPk(card.id);
          if (actor) {
            return {
              id: actor.id,
              type: "acteur",
              nom: actor.name,
              rarete: actor.rarete,
              nb_films: actor.nb_films,
              count: card.count,
            };
          }
        } else if (card.type === "film") {
          const film = await Movies.findByPk(card.id);
          if (film) {
            const isCompleted = await CompletedFilms.findOne({
              where: { user_id: req.user.id, movie_id: film.id },
            });
            return {
              id: film.id,
              type: "film",
              titre: film.title,
              rarete: film.rarete,
              nb_acteurs: film.nb_acteurs,
              affiche: !!isCompleted,
              count: card.count,
            };
          }
        }
        return null;
      })
    );

    res.json(enrichedCollection.filter(Boolean));
  } catch (error) {
    console.error("Erreur lors de la récupération de la collection:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Alternative si les associations sont déjà configurées
router.get("/movies/:id/details", auth, async (req, res) => {
  try {
    const movieId = req.params.id;

    if (!movieId) {
      return res.status(422).json({ message: "ID du film requis." }); // 422 pour ID manquant
    }

    const movie = await Movies.findOne({ where: { id: movieId }, raw: true });

    if (!movie) {
      return res.status(404).json({ message: "Film non trouvé." }); // 404 pour film non trouvé
    }

    const movieGenres = await MoviesGenre.findAll({
      where: { id_movie: movieId },
      raw: true,
    });
    const genreIds = movieGenres.map((mg) => mg.id_genre);
    const genres =
      genreIds.length > 0
        ? await Genre.findAll({ where: { id: genreIds }, raw: true })
        : [];

    res.status(200).json({
      nb_acteurs: movie.nb_acteurs,
      genre: genres.map((g) => g.name).join(", "),
      annee: movie.year,
    }); // 200 pour succès
  } catch (error) {
    console.error("Erreur lors de la récupération des détails du film:", error);
    res.status(500).json({ message: "Erreur serveur." }); // 500 pour erreur serveur
  }
});

router.get("/actor/:id/details", auth, async (req, res) => {
  try {
    const actorId = req.params.id;

    // Récupérer le film directement avec une requête simple
    const actor = await Actors.findOne({
      where: { id: actorId },
      raw: true, // Retourne un objet JavaScript simple au lieu d'une instance de modèle
    });

    const movieActors = await MoviesActors.findAll({
      where: { id_actor: actorId },
      raw: true,
    });
    console.log(actor.nb_genres);
    const count = movieActors.length;

    if (!actor) {
      return res.status(404).json({ message: "Acteur non trouvé" });
    }
    res.json({
      career_start: actor.career_start,
      nb_genres: actor.nb_genres,
      nb_films: count,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des détails du film:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
module.exports = router;
