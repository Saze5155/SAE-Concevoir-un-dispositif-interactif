const express = require("express");
const router = express.Router();
const { Actors, Movies, MoviesActors } = require("../sgbd/models.js");
const myDB = require("../sgbd/config.js");

// Get all movies and their actors
router.get("/", async (req, res) => {
  try {
    const movies = await MoviesActors.findAll();
    res.status(200).json({ message: "Movies and their actors", data: movies }); // 200 pour succès
  } catch (error) {
    console.error("Error fetching movies and their actors:", error);
    res
      .status(500)
      .json({
        message: "Erreur serveur lors de la récupération des films et acteurs.",
      }); // 500 pour erreur serveur
  }
});

module.exports = router;
