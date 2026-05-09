class GetUserBoards {
    constructor(boardRepository) {
        this.boardRepository = boardRepository;
    }

    async execute(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        // Get boards where user is owner
        const ownerBoards = await this.boardRepository.findByOwner(userId);
        
        // Get boards where user is participant
        const participantBoards = await this.boardRepository.findByParticipant(userId);
        
        // Combine and remove duplicates (by board id)
        const allBoards = [...ownerBoards, ...participantBoards];
        const uniqueBoards = Array.from(
            new Map(allBoards.map(board => [board.id, board])).values()
        );
        
        return uniqueBoards;
    }
}

module.exports = GetUserBoards;
