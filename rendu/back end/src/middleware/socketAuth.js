const jwt = require("jsonwebtoken");

module.exports = function socketAuth(io) {
  io.use((socket, next) => {
    const token = socket.handshake.query.token;

    if (!token) {
      return next(new Error("Token manquant"));
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "supersecret"
      );
      socket.userId = decoded.id; // on extrait l'ID de l'utilisateur
      next();
    } catch (err) {
      return next(new Error("Token invalide"));
    }
  });
};
