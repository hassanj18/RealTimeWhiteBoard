class AddUserToBoard {
    constructor(boardRepository) {
        this.boardRepository = boardRepository;
    }

    async execute(boardId, userId, userName) {
        console.log('AddUserToBoard', boardId, userId, userName);
        if (!boardId) {
            throw new Error('Board ID is required');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        const board = await this.boardRepository.findById(boardId);
        if (!board) {
            throw new Error('Board not found');
        }

        // Check if user is already in active participants
        const existingActiveParticipant = board.activeParticipants.find(p => p.userId === userId);
        if (existingActiveParticipant) {
            console.log(`[AddUserToBoard] User ${userId} is already an active participant in board ${boardId}`);
            return board.toJSON();
        }

        // Check if user is the owner
        // Add user to active participants (for WebSocket session tracking)
        try {
            board.addActiveParticipant(userId, userName);
            await this.boardRepository.save(board);
            console.log(`[AddUserToBoard] User ${userId} (${userName || 'Unknown'}) added to board ${boardId} as active participant`);
        } catch (error) {
            if (error.message === 'Active participant already exists') {
                console.log(`[AddUserToBoard] User ${userId} is already an active participant in board ${boardId}`);
            } else {
                throw error;
            }
        }

        return board.toJSON();
    }
}

module.exports = AddUserToBoard;
