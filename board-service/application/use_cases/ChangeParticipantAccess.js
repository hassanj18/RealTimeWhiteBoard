const { topicForEventType } = require('../../infrastructure/messaging/kafkaTopics');

class ChangeParticipantAccess {
    constructor(boardRepository, kafkaProducer) {
        this.boardRepository = boardRepository;
        this.kafkaProducer = kafkaProducer;
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
        
        // Publish event to Kafka for action service to broadcast
        const event = {
            type: 'BOARD_EVENT',
            payload: {
                boardId: boardId,
                eventType: 'PARTICIPANT_ACCESS_CHANGED',
                participantId: participantId,
                newAccess: newAccess,
                changedBy: userId
            }
        };
        
        await this.kafkaProducer.publish(topicForEventType('BOARD_EVENT'), event);
        
        return { message: 'Participant access changed successfully', board: updatedBoard };
    }
}

module.exports = ChangeParticipantAccess;
