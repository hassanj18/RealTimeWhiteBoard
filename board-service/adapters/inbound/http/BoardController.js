class BoardController {
    constructor(createBoard, getUserBoards, deleteBoard, changeParticipantAccess, getUserAccess, getActiveParticipants, requestBoardAccess, addParticipantToBoard) {
        this.createBoard = createBoard;
        this.getUserBoards = getUserBoards;
        this.deleteBoard = deleteBoard;
        this.changeParticipantAccess = changeParticipantAccess;
        this.getUserAccess = getUserAccess;
        this.getActiveParticipants = getActiveParticipants;
        this.requestBoardAccess = requestBoardAccess;
        this.addParticipantToBoard = addParticipantToBoard;
    }

    async createBoardHandler(req, res) {
        try {
            const userId = req.user.userId;
            const boardData = req.body;
            
            const result = await this.createBoard.execute(userId, boardData);
            
            res.status(201).json(result.toJSON());
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async getUserBoardsHandler(req, res) {
        try {
            const userId = req.user.userId;
            
            const boards = await this.getUserBoards.execute(userId);
            
            const boardsJSON = boards.map(board => {
                const json = board.toJSON();
                return {
                    id: json.id,
                    name: json.name,
                    description: json.description
                };
            });
            res.status(200).json(boardsJSON);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async deleteBoardHandler(req, res) {
        try {
            const userId = req.user.userId;
            const boardId = req.params.id;
            
            const result = await this.deleteBoard.execute(boardId, userId);
            
            res.status(200).json(result);
        } catch (err) {
            if (err.message.includes('not found')) {
                res.status(404).json({ error: err.message });
            } else if (err.message.includes('Unauthorized')) {
                res.status(401).json({ error: err.message });
            } else {
                res.status(400).json({ error: err.message });
            }
        }
    }

    async changeParticipantAccessHandler(req, res) {
        try {
            const userId = req.user.userId;
            const boardId = req.params.id;
            const { participantId, access } = req.body;
            
            const result = await this.changeParticipantAccess.execute(boardId, userId, participantId, access);
            
            res.status(200).json(result);
        } catch (err) {
            if (err.message.includes('not found')) {
                res.status(404).json({ error: err.message });
            } else if (err.message.includes('Unauthorized')) {
                res.status(401).json({ error: err.message });
            } else {
                res.status(400).json({ error: err.message });
            }
        }
    }

    async getUserAccessHandler(req, res) {
        try {
            const userId = req.user.userId;
            const boardId = req.params.id;
            const userName = req.user.name;
            
            const result = await this.getUserAccess.execute(boardId, userId, userName);
            result["userName"] = (req.user.email ?? "").split("@")[0];
            res.status(200).json(result);
        } catch (err) {
            if (err.message.includes('not found')) {
                res.status(404).json({ error: err.message });
            } else if (err.message.includes('User not found in board')) {
                res.status(403).json({ error: err.message });
            } else {
                res.status(400).json({ error: err.message });
            }
        }
    }

    async getActiveParticipantsHandler(req, res) {
        try {
            const userId = req.user.userId;
            const boardId = req.params.id;
            
            const result = await this.getActiveParticipants.execute(boardId, userId);
            res.status(200).json(result);
        } catch (err) {
            if (err.message.includes('not found')) {
                res.status(404).json({ error: err.message });
            } else if (err.message.includes('Access denied')) {
                res.status(403).json({ error: err.message });
            } else {
                res.status(400).json({ error: err.message });
            }
        }
    }

    async requestBoardAccessHandler(req, res) {
        try {
            const userId = req.user.userId;
            const boardId = req.params.id;
            const userName = req.user.name || (req.user.email ?? "").split("@")[0] || "Unknown User";
            
            const result = await this.requestBoardAccess.execute(boardId, userId, userName);
            res.status(200).json(result);
        } catch (err) {
            if (err.message.includes('not found')) {
                res.status(404).json({ error: err.message });
            } else {
                res.status(400).json({ error: err.message });
            }
        }
    }

    async addParticipantHandler(req, res) {
        try {
            const userId = req.user.userId;
            const boardId = req.params.id;
            const participantId = req.params.userId;
            const { access } = req.body;

            const result = await this.addParticipantToBoard.execute(boardId, userId, participantId, access);
            res.status(201).json(result);
        } catch (err) {
            if (err.message.includes('not found')) {
                res.status(404).json({ error: err.message });
            } else if (err.message.includes('Forbidden') || err.message.includes('Unauthorized')) {
                res.status(403).json({ error: err.message });
            } else {
                res.status(400).json({ error: err.message });
            }
        }
    }

    async updateParticipantAccessHandler(req, res) {
        try {
            const userId = req.user.userId;
            const boardId = req.params.id;
            const participantId = req.params.userId;
            const { access } = req.body;

            const result = await this.changeParticipantAccess.execute(boardId, userId, participantId, access);
            res.status(200).json(result);
        } catch (err) {
            if (err.message.includes('not found')) {
                res.status(404).json({ error: err.message });
            } else if (err.message.includes('Unauthorized')) {
                res.status(401).json({ error: err.message });
            } else {
                res.status(400).json({ error: err.message });
            }
        }
    }
}

module.exports = BoardController;
