const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const { User, Progression } = require("../sgbd/models.js");

const jwt = require("jsonwebtoken");
const { DATE } = require("sequelize");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ message: "Email et mot de passe requis." }); // 422 pour champs manquants
  }

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." }); // 404 pour utilisateur non trouvé
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Mot de passe incorrect." }); // 401 pour mot de passe incorrect
    }

    const token = jwt.sign(
      { id: user.id, pseudo: user.pseudo },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "2h" }
    );

    res.status(200).json({ message: "Connexion réussie", token }); // 200 pour succès
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." }); // 500 pour erreur serveur
  }
});

router.post("/register", async (req, res) => {
  const { pseudo, email, password } = req.body;

  if (!pseudo || !email || !password) {
    return res.status(400).json({ message: "Champs requis manquants." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      pseudo,
      email,
      password: hashedPassword,
    });

    const progression = await Progression.create({
      user_id: newUser.id,
      argent_virtuel: 1000,
      cartes_obtenues: "",
      dernier_tirage: new Date(),
    });

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: { id: newUser.id, pseudo: newUser.pseudo },
    });
  } catch (err) {
    console.error(err);
    if (err.name === "SequelizeUniqueConstraintError") {
      res.status(409).json({ message: "Pseudo ou email déjà utilisé." });
    } else {
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
});

module.exports = router;
