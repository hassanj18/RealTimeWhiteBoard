class GetActiveParticipants {
    constructor(boardRepository) {
        this.boardRepository = boardRepository;
    }

    async execute(boardId, requestingUserId) {
        // Find the board
        const board = await this.boardRepository.findById(boardId);
        if (!board) {
            throw new Error('Board not found');
        }

        // Check if user has access to this board
        try {
            board.getUserAccess(requestingUserId);
        } catch (error) {
            throw new Error('Access denied: User does not have access to this board');
        }

        // Return active participants
        return {
            boardId: board.id,
            boardName: board.name,
            activeParticipants: board.activeParticipants,
            totalActive: board.activeParticipants.length
        };
    }
}

module.exports = GetActiveParticipants;
