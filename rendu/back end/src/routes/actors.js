const express = require("express");
const router = express.Router();

const { Actors, Movies, MoviesActors } = require("../sgbd/models.js");
const myDB = require("../sgbd/config.js");

// Get all actors
router.get("/", async (req, res) => {
  try {
    const actors = await Actors.findAll();
    res.status(200).json({ message: "Actors", data: actors }); // 200 pour succès
  } catch (error) {
    console.error("Error fetching actors:", error);
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la récupération des acteurs." }); // 500 pour erreur serveur
  }
});

module.exports = router;
