const passport = require("passport");
const Router = require("express").Router();
Router.get("/", passport.authenticate("google", { scope: ["profile", "email"] }));

Router.get(
	"/callback",
	passport.authenticate("google", { failureRedirect: "/login" }),
	function (req, res) {
		// Successful authentication, redirect home.
		res.redirect("http://localhost:3000");
	}
);

module.exports = Router;
