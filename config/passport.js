const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const allowedUsers = require("./allowedUsers");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://trivi-attendance.onrender.com/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;

      if (!allowedUsers.includes(email)) {
        return done(null, false);
      }

      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));

passport.deserializeUser((user, done) => done(null, user));