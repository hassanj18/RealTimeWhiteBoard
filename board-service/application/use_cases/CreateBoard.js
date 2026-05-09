const Board = require('../../domain/entities/Board');

class CreateBoard {
    constructor(boardRepository) {
        this.boardRepository = boardRepository;
    }

    async execute(userId, boardData) {
        if (!boardData.name) {
            throw new Error('Board name is required');
        }

        const board = new Board({
            name: boardData.name,
            description: boardData.description || '',
            owner: userId
        });

        return await this.boardRepository.save(board);
    }
}

module.exports = CreateBoard;
