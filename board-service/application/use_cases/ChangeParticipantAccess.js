class ChangeParticipantAccess {
    constructor(boardRepository) {
        this.boardRepository = boardRepository;
    }

    async execute(boardId, userId, participantId, newAccess) {
        if (!boardId) {
            throw new Error('Board ID is required');
        }

        if (!participantId) {
            throw new Error('Participant ID is required');
        }

        if (!newAccess) {
            throw new Error('Access level is required');
        }

        const board = await this.boardRepository.findById(boardId);
        if (!board) {
            throw new Error('Board not found');
        }

        board.changeParticipantAccess(participantId, newAccess, userId);
        
        const updatedBoard = await this.boardRepository.save(board);
        
        return { message: 'Participant access changed successfully', board: updatedBoard };
    }
}

module.exports = ChangeParticipantAccess;
