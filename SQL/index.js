const express = require("express");
const app = express();
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const mysql = require("mysql2");
const { connect } = require("http2");
require("dotenv").config();
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log("Server active....");
});

connection.connect((err) => {
  if (err) {
    console.log("Error connecting to the Database!");
    return;
  }

  app.get("/", (req, res) => {
    connection.query("SELECT count(*) FROM users", (err, result) => {
      if (err) return res.send(err);
      const count = result[0]["count(*)"];
      res.render("home.ejs", { count });
    });
  });

  app.get("/list", (req, res) => {
    connection.query("SELECT id, username, email FROM users", (err, users) => {
      if (err) return res.send(err);
      res.render("list.ejs", { users });
    });
  });

  app.get("/new", (req, res) => {
    res.render("new.ejs");
  });

  app.post("/new", (req, res) => {
    const { username, email, password } = req.body;
    const params = [uuidv4(), username, email, password];
    const q = "INSERT INTO users VALUES (?, ?, ?, ?)";
    connection.query(q, params, (err) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.redirect("/");
    });
  });

  app.get("/:id/edit", (req, res) => {
    const { id } = req.params;
    const q = "SELECT username, password FROM users WHERE id = ?";
    connection.query(q, id, (err, result) => {
      if (err) return res.status(500).send(err);
      const username = result[0].username;
      const password = result[0].password;
      res.render("update.ejs", { id, username, password });
    });
  });

  app.patch("/:id/edit", (req, res) => {
    const { username } = req.body;
    const { id } = req.params;
    const q = "UPDATE users SET username = ? WHERE id = ?";
    const params = [username, id];
    connection.query(q, params, (err) => {
      if (err) return res.sendStatus(500).send(err);
      res.redirect("/list");
    });
  });

  app.post("/check/:id", (req, res) => {
    const { password } = req.body;
    const { id } = req.params;
    const q = "SELECT password FROM users WHERE id = ?";
    connection.query(q, id, (err, result) => {
      if (err) return res.sendStatus(500).json({ valid: false });
      const storedPass = result[0].password;
      if (storedPass == password) {
        res.json({ valid: true });
      } else res.json({ valid: false });
    });
  });
});
