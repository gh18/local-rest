var mongoose = require('mongoose');
Schema = mongoose.Schema;

const Order = mongoose.model('Order', {
    guest: { type: Schema.Types.ObjectId, ref: 'Guest' },
    space: String,
    date: String,
    time: String,
    persons: Number,
    table: String,
    info: String
});

module.exports = Order