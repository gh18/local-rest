var mongoose = require('mongoose');
Schema = mongoose.Schema;

const Guest = mongoose.model('Guest', {
    _id: mongoose.Schema.Types.ObjectId,
    username: String,
    password: String,
    email: String,
    phone: String,
    reservations: [],
});

module.exports = Guest