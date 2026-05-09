class DeleteBoard {
    constructor(boardRepository) {
        this.boardRepository = boardRepository;
    }

    async execute(boardId, userId) {
        if (!boardId) {
            throw new Error('Board ID is required');
        }

        const board = await this.boardRepository.findById(boardId);
        if (!board) {
            throw new Error('Board not found');
        }

        board.validateOwnership(userId);
        
        await this.boardRepository.delete(boardId);
        
        return { message: 'Board deleted successfully' };
    }
}

module.exports = DeleteBoard;
