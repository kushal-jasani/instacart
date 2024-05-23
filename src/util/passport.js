const passport = require("passport");
const { findUser, insertUser } = require("../repository/auth");
const passportGoogle = require("passport-google-oauth2").Strategy;

const GoogleStrategy = passportGoogle.Strategy;

const useGoogleStrategy=()=>{

passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_AUTH_CLIENT_ID,
        clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET,
        callbackURL:
          process.env.NODE_ENV === "production"
            ? "https://instacart-xqwi.onrender.com/auth/google/callback"
            : "http://localhost:8080/auth/google/callback",
  
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let email = profile.emails[0].value;
          let [user] = await findUser({ email: email });
          if (!user || user.length == 0) {
            let country_code,
              phoneno,
              hashedPassword,
              firstName,
              lastName,
              is_verify;
            let from_google = 1;
            firstName = profile.given_name;
            lastName = profile.family_name;
  
            [user] = await insertUser(
              email,
              country_code,
              phoneno,
              firstName,
              lastName,
              is_verify,
              hashedPassword,
              from_google
            );
          }
          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
  
  passport.serializeUser((user, done) => {
    const id = user.insertId ? user.insertId : user[0].id;
    done(null, id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const [user] = await findUser({ id });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

module.exports={useGoogleStrategy}
  