const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    name: String,
    description: String,
    createdAt: Date,
    updatedAt: Date,
    owner: {
        type: String,
        required: true,
    },
    participants: [
        {
            userId: {
                type: String,
                required: true
            },
            access: {
                type: String,
                enum: ['view', 'edit'],
                default: 'view'
            }
        }
    ],
    activeParticipants: [
        {
            userId: {
                type: String,
                required: true
            },
            userName: {
                type: String,
                required: true
            }
        }
    ]
});

const BoardModel = mongoose.model('Board', boardSchema);

module.exports = BoardModel;
