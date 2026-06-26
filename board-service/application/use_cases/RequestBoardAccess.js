const { topicForEventType } = require('../../infrastructure/messaging/kafkaTopics');

class RequestBoardAccess {
    constructor(boardRepository, kafkaProducer) {
        this.boardRepository = boardRepository;
        this.kafkaProducer = kafkaProducer;
    }

    async execute(boardId, userId, userName) {
        // Get the board to find the owner
        const board = await this.boardRepository.findById(boardId);
        if (!board) {
            throw new Error('Board not found');
        }

        // Check if user is already owner or participant
        if (board.owner === userId) {
            throw new Error('You are already the owner of this board');
        }

        const isParticipant = board.participants.some(p => p.userId === userId);
        if (isParticipant) {
            throw new Error('You are already a participant in this board');
        }

        const ownerId = board.owner;

        // Publish the event
        await this.kafkaProducer.publish(topicForEventType('JOIN_BOARD_REQUEST'), {
            type: 'JOIN_BOARD_REQUEST',
            payload: {
                ownerId: ownerId,
                boardId: boardId,
                requesterId: userId,
                userName: userName
            }
        });

        return { message: 'Request initiated' };
    }
}

module.exports = RequestBoardAccess;