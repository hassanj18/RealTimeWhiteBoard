class AddParticipantToBoard {
    constructor(boardRepository) {
        this.boardRepository = boardRepository;
    }

    async execute(boardId, requestingUserId, participantId, access) {
        if (!boardId) {
            throw new Error('Board ID is required');
        }

        if (!participantId) {
            throw new Error('Participant ID is required');
        }

        if (!access) {
            throw new Error('Access level is required');
        }

        if (!['view', 'edit'].includes(access)) {
            throw new Error('Invalid access level: must be view or edit');
        }

        const board = await this.boardRepository.findById(boardId);
        if (!board) {
            throw new Error('Board not found');
        }

        if (board.owner !== requestingUserId) {
            throw new Error('Forbidden: Only the board owner may add participants');
        }

        board.addParticipant(participantId, access);
        const updatedBoard = await this.boardRepository.save(board);

        return { message: 'Participant added successfully', board: updatedBoard };
    }
}

module.exports = AddParticipantToBoard;
