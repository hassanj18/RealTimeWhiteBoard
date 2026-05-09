const mongoose = require('mongoose')

const boardSchema = new mongoose.Schema({
    name: String,
    description: String,
    createdAt: Date,
    updatedAt: Date,
    owner:{
        type:String,
        required:true,
    },
    participants:[
        {
            userId:{
                type:String,
                required:true
            },
            access: {
                type: String,
                enum: ['view', 'edit'],
                default: 'view'
            }
        }
    ]
})

module.exports = mongoose.model('Board', boardSchema)

