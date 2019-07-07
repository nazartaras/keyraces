const passport = require("passport");
const JWTStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const users = require('./users.json');

const opt = {
    secretOrKey: 'someSecret',
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() 
};

passport.use(new JWTStrategy(opt, async (payload, done)=>{
    console.log(opt.jwtFromRequest);
    try {
        const user = users.find(userFromDB => {
            if(userFromDB.login === payload.login){
                return userFromDB;
            }
        });
        return user ? done(null,user):done({status: 401, message: "Token is invalid"}, null);
    } catch  {
        return done(err);
    }
}
));
