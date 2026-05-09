class GetUserAccess {
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

        const accessInfo = board.getUserAccess(userId);
        
        return {
            boardId: board.id,
            boardName: board.name,
            userId: userId,
            userName: userName || 'Unknown User',
            ...accessInfo
        };
    }
}

module.exports = GetUserAccess;
