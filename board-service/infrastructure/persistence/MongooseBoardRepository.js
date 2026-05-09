const BoardRepository = require('../../application/ports/BoardRepository');
const Board = require('../../domain/entities/Board');
const BoardModel = require('./BoardSchema');

class MongooseBoardRepository extends BoardRepository {
    async save(board) {
        const boardData = {
            name: board.name,
            description: board.description,
            owner: board.owner,
            participants: board.participants,
            activeParticipants: board.activeParticipants,
            createdAt: board.createdAt,
            updatedAt: board.updatedAt
        };

        let savedBoard;
        if (board.id) {
            savedBoard = await BoardModel.findByIdAndUpdate(board.id, boardData, { new: true, upsert: true });
        } else {
            const newBoard = new BoardModel(boardData);
            savedBoard = await newBoard.save();
        }

        return this.mapToDomainEntity(savedBoard);
    }

    async findById(id) {
        const board = await BoardModel.findById(id);
        if (!board) {
            return null;
        }
        return this.mapToDomainEntity(board);
    }

    async findByOwner(ownerId) {
        const boards = await BoardModel.find({ owner: ownerId });
        return boards.map(board => this.mapToDomainEntity(board));
    }

    async findByParticipant(userId) {
        const boards = await BoardModel.find({ "participants.userId": userId });
        return boards.map(board => this.mapToDomainEntity(board));
    }

    async delete(id) {
        const result = await BoardModel.findByIdAndDelete(id);
        return result !== null;
    }

    mapToDomainEntity(boardDocument) {
        return new Board({
            id: boardDocument._id.toString(),
            name: boardDocument.name,
            description: boardDocument.description,
            owner: boardDocument.owner,
            participants: boardDocument.participants,
            activeParticipants: boardDocument.activeParticipants || [],
            createdAt: boardDocument.createdAt,
            updatedAt: boardDocument.updatedAt
        });
    }
}

module.exports = MongooseBoardRepository;
