module.exports = {
    ensureAuthenticated: function(req, res, next){
        if(req.isAuthenticated()){
            return next();
        }
        req.flash("error_msg", "Please log in");
        req.flash("error_full_msg", "You need to be logged in to continue");
        res.redirect("/login")
    }
}