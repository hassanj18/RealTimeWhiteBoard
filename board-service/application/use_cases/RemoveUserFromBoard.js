class RemoveUserFromBoard {
    constructor(boardRepository) {
        this.boardRepository = boardRepository;
    }

    async execute(boardId, userId, userName) {
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

        // Remove user from active participants
        try {
            board.removeActiveParticipant(userId);
            await this.boardRepository.save(board);
            console.log(`[RemoveUserFromBoard] User ${userId} (${userName || 'Unknown'}) removed from board ${boardId} active participants`);
        } catch (error) {
            if (error.message === 'Active participant not found') {
                console.log(`[RemoveUserFromBoard] User ${userId} not found in active participants of board ${boardId}`);
            } else {
                throw error;
            }
        }

        return board.toJSON();
    }
}

module.exports = RemoveUserFromBoard;
