const Board = require("./models")
 class BoardController{

    /**
     * Create a new board
     * @param {Object} req - The request object
     * @param {Object} res - The response object
     * @returns {Promise} A promise that resolves to the created board
     */
    static async createBoard(req, res) {
        try {
            req.body["owner"] = req.user.userId;
            const board = new Board(req.body);
            const newBoard = await board.save();
            res.status(201).json(newBoard);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async getUserBaords(req,res){
        const user=req.user
        const boards = await Board.find({ owner: user.userId });
        res.status(200).json(boards);
    }
    static async deleteBoard(req,res){
        const board = await Board.findById(req.params.id);
        if(req.user.userId !== board.owner){
            return res.status(401).json({ error: "Unauthorized" });
        }
        await board.remove();
        res.status(200).json({ message: "Board deleted successfully" });
    }
    static async changeParticipantAccess(req,res){
        const board = await Board.findById(req.params.id);
        if(!board){
            return res.status(404).json({ error: "Board not found" });
        }
        if(req.user.userId !== board.owner){
            return res.status(401).json({ error: "Unauthorized" });
        }
        if(!req.body.participantId){
            return res.status(400).json({ error: "Participant ID is required" });
        }
        const participant = board.participants.id(req.body.participantId);
        if(!participant){
            return res.status(404).json({ error: "Participant not found" });
        }
        if(!req.body.access){
            return res.status(400).json({ error: "Access level is required" });
        }
        if(!["view", "edit"].includes(req.body.access)){
            return res.status(400).json({ error: "Invalid access level" });
        }
        participant.access = req.body.access;
        await board.save();
        res.status(200).json({ message: "Participant access changed successfully" });
    }
}
module.exports = BoardController;

